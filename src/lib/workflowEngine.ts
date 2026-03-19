// @ts-nocheck
// Rule Engine & Workflow Execution — Prisma-backed with loop detection
import { prisma } from "./prisma";

const MAX_LOOP_ITERATIONS = 50; // Prevent infinite loops

// ─── Rule Evaluation ────────────────────────────────────────────────────────

function evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
  if (condition.trim() === "DEFAULT") return true;
  try {
    let expr = condition
      .replace(/contains\((\w+),\s*["']([^"']*)["']\)/g, (_, field, val) =>
        String(String(data[field] ?? "").includes(val))
      )
      .replace(/startsWith\((\w+),\s*["']([^"']*)["']\)/g, (_, field, val) =>
        String(String(data[field] ?? "").startsWith(val))
      )
      .replace(/endsWith\((\w+),\s*["']([^"']*)["']\)/g, (_, field, val) =>
        String(String(data[field] ?? "").endsWith(val))
      );

    // Replace field names with values (longest first to avoid partial replacements)
    const fieldNames = Object.keys(data).sort((a, b) => b.length - a.length);
    for (const field of fieldNames) {
      const val = data[field];
      const replacement = typeof val === "string" ? `"${val}"` : String(val ?? "null");
      expr = expr.replace(new RegExp(`\\b${field}\\b`, "g"), replacement);
    }

    // Normalize loose equality operators
    expr = expr.replace(/([^!=<>])={2}(?!=)/g, "$1===").replace(/!={1}(?!=)/g, "!==");

    return Boolean(eval(expr));
  } catch {
    return false;
  }
}

interface DbRule { id: string; condition: string; nextStepId: string | null; priority: number; }

function evaluateRules(rules: DbRule[], data: Record<string, unknown>) {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const evaluations: { rule: string; result: boolean }[] = [];
  let matchedRule: DbRule | null = null;

  for (const rule of sorted) {
    const result = evaluateCondition(rule.condition, data);
    evaluations.push({ rule: rule.condition, result });
    if (result && !matchedRule) matchedRule = rule;
  }

  return { evaluations, matchedRule };
}

// ─── Main Execution Flow ─────────────────────────────────────────────────────

async function runStepsFrom(
  executionId: string,
  startStepId: string | null,
  data: Record<string, unknown>,
  workflowSteps: any[],
) {
  let currentStepId = startStepId;
  let iterations = 0;
  const visitedSteps = new Set<string>();

  while (currentStepId) {
    if (iterations++ >= MAX_LOOP_ITERATIONS) {
      await prisma.execution.update({
        where: { id: executionId },
        data: { status: "failed", endedAt: new Date() },
      });
      throw new Error(`Max loop iterations (${MAX_LOOP_ITERATIONS}) exceeded. Possible infinite loop.`);
    }

    const step = workflowSteps.find((s) => s.id === currentStepId);
    if (!step) break;

    // Track visited for loop warning (not error — loops are allowed up to max)
    if (visitedSteps.has(step.id)) {
      // Loop detected — this is allowed but counted toward max iterations
    }
    visitedSteps.add(step.id);

    // Approval steps pause execution
    if (step.stepType === "approval") {
      await prisma.executionLog.create({
        data: {
          executionId,
          stepId: step.id,
          stepName: step.name,
          stepType: step.stepType,
          evaluatedRules: [],
          status: "pending",
          startedAt: new Date(),
        },
      });
      await prisma.execution.update({
        where: { id: executionId },
        data: { status: "pending", currentStepId: step.id },
      });
      return prisma.execution.findUnique({ where: { id: executionId }, include: { logs: { orderBy: { startedAt: "asc" } } } });
    }

    const stepStart = new Date();
    let nextStepId: string | null = null;
    let evaluations: any[] = [];
    let stepStatus = "completed";
    let errorMessage: string | null = null;

    if (step.rules && step.rules.length > 0) {
      const result = evaluateRules(step.rules, data);
      evaluations = result.evaluations;

      if (result.matchedRule) {
        nextStepId = result.matchedRule.nextStepId;
      } else {
        // No rule matched — look for DEFAULT rule explicitly
        const defaultRule = step.rules.find((r: any) => r.condition.trim() === "DEFAULT");
        if (defaultRule) {
          nextStepId = defaultRule.nextStepId;
        } else {
          stepStatus = "failed";
          errorMessage = "No matching rule found and no DEFAULT rule defined";
          await prisma.executionLog.create({
            data: {
              executionId, stepId: step.id, stepName: step.name,
              stepType: step.stepType, evaluatedRules: evaluations,
              status: "failed", errorMessage, startedAt: stepStart, endedAt: new Date(),
            },
          });
          await prisma.execution.update({
            where: { id: executionId },
            data: { status: "failed", endedAt: new Date() },
          });
          return prisma.execution.findUnique({ where: { id: executionId }, include: { logs: { orderBy: { startedAt: "asc" } } } });
        }
      }
    } else {
      // No rules — proceed to next step by order
      const nextStep = workflowSteps.find((s) => s.order === step.order + 1);
      nextStepId = nextStep?.id ?? null;
    }

    await prisma.executionLog.create({
      data: {
        executionId, stepId: step.id, stepName: step.name,
        stepType: step.stepType, evaluatedRules: evaluations,
        selectedNextStep: nextStepId, status: stepStatus,
        errorMessage, startedAt: stepStart, endedAt: new Date(),
      },
    });

    currentStepId = nextStepId;
  }

  await prisma.execution.update({
    where: { id: executionId },
    data: { status: "completed", currentStepId: null, endedAt: new Date() },
  });

  return prisma.execution.findUnique({ where: { id: executionId }, include: { logs: { orderBy: { startedAt: "asc" } } } });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function executeWorkflow(workflowId: string, data: Record<string, unknown>, triggeredBy: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { steps: { include: { rules: { orderBy: { priority: "asc" } } }, orderBy: { order: "asc" } } },
  });
  if (!workflow) throw new Error("Workflow not found");
  if (!workflow.isActive) throw new Error("Workflow is not active");

  const execution = await prisma.execution.create({
    data: {
      workflowId,
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      status: "in_progress",
      data,
      currentStepId: workflow.startStepId,
      triggeredBy,
    },
  });

  return runStepsFrom(execution.id, workflow.startStepId, data, workflow.steps);
}

export async function approveStep(executionId: string, approverId: string) {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: {
      workflow: { include: { steps: { include: { rules: { orderBy: { priority: "asc" } } }, orderBy: { order: "asc" } } } },
      logs: { orderBy: { startedAt: "desc" } },
    },
  });
  if (!execution || execution.status !== "pending") throw new Error("Invalid execution state");

  const currentStep = execution.workflow.steps.find((s: any) => s.id === execution.currentStepId);
  if (!currentStep) throw new Error("Current step not found");

  const data = execution.data as Record<string, unknown>;
  let nextStepId: string | null = null;
  let evaluations: any[] = [];

  if (currentStep.rules.length > 0) {
    const result = evaluateRules(currentStep.rules, data);
    evaluations = result.evaluations;
    nextStepId = result.matchedRule?.nextStepId ?? null;
  } else {
    const nextStep = execution.workflow.steps.find((s: any) => s.order === currentStep.order + 1);
    nextStepId = nextStep?.id ?? null;
  }

  // Log the approval
  await prisma.executionLog.create({
    data: {
      executionId, stepId: currentStep.id, stepName: currentStep.name,
      stepType: currentStep.stepType, evaluatedRules: evaluations,
      selectedNextStep: nextStepId, status: "completed",
      approverId, startedAt: new Date(), endedAt: new Date(),
    },
  });

  await prisma.execution.update({
    where: { id: executionId },
    data: { status: "in_progress", currentStepId: nextStepId },
  });

  return runStepsFrom(executionId, nextStepId, data, execution.workflow.steps);
}

export async function rejectStep(executionId: string, approverId: string) {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: {
      workflow: { include: { steps: true } },
    },
  });
  if (!execution) throw new Error("Execution not found");

  const currentStep = execution.workflow.steps.find((s: any) => s.id === execution.currentStepId);

  await prisma.executionLog.create({
    data: {
      executionId,
      stepId: currentStep?.id ?? "",
      stepName: currentStep?.name ?? "Unknown",
      stepType: currentStep?.stepType ?? "approval",
      evaluatedRules: [],
      status: "failed",
      approverId,
      errorMessage: "Rejected by approver",
      startedAt: new Date(),
      endedAt: new Date(),
    },
  });

  return prisma.execution.update({
    where: { id: executionId },
    data: { status: "failed", endedAt: new Date() },
    include: { logs: { orderBy: { startedAt: "asc" } } },
  });
}

export async function retryFromStep(executionId: string, fromStepId: string, data: Record<string, unknown>, workflow: any) {
  const steps = workflow.steps;
  return runStepsFrom(executionId, fromStepId, data, steps);
}
