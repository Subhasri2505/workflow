export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/seed — creates sample workflows for demo
export async function POST() {
  try {
    // Clean up existing seed data (by name)
    const existingWorkflows = await prisma.workflow.findMany({
      where: { name: { in: ["Expense Approval", "Employee Onboarding"] } },
      select: { id: true },
    });
    const wfIds = existingWorkflows.map((w) => w.id);

    if (wfIds.length > 0) {
      await prisma.executionLog.deleteMany({
        where: { execution: { workflowId: { in: wfIds } } },
      });
      await prisma.execution.deleteMany({
        where: { workflowId: { in: wfIds } },
      });
      await prisma.workflow.deleteMany({
        where: { id: { in: wfIds } },
      });
    }

    // ── Workflow 1: Expense Approval ──────────────────────────
    const expenseWf = await prisma.workflow.create({
      data: {
        name: "Expense Approval",
        description: "Routes expense requests through manager → finance → CEO approvals based on amount and priority.",
        version: 1,
        isActive: true,
        inputSchema: {
          amount: { type: "number", required: true },
          country: { type: "string", required: true },
          department: { type: "string", required: false },
          priority: { type: "string", required: true, allowed_values: ["High", "Medium", "Low"] },
        },
      },
    });

    const [managerStep, ceoStep, financeStep, rejectionStep] = await Promise.all([
      prisma.step.create({ data: { workflowId: expenseWf.id, name: "Manager Approval", stepType: "approval", order: 1, metadata: { assignee_email: "manager@example.com" } } }),
      prisma.step.create({ data: { workflowId: expenseWf.id, name: "CEO Approval", stepType: "approval", order: 2, metadata: { assignee_email: "ceo@example.com" } } }),
      prisma.step.create({ data: { workflowId: expenseWf.id, name: "Finance Notification", stepType: "notification", order: 3, metadata: { channel: "slack", template: "finance-alert" } } }),
      prisma.step.create({ data: { workflowId: expenseWf.id, name: "Task Rejection", stepType: "task", order: 4, metadata: { action: "send_rejection_email" } } }),
    ]);

    // Set start step
    await prisma.workflow.update({
      where: { id: expenseWf.id },
      data: { startStepId: managerStep.id },
    });

    // Rules for Manager Approval step
    await prisma.rule.createMany({
      data: [
        { stepId: managerStep.id, condition: "amount > 1000", nextStepId: ceoStep.id, priority: 1 },
        { stepId: managerStep.id, condition: "amount <= 1000", nextStepId: financeStep.id, priority: 2 },
        { stepId: managerStep.id, condition: "DEFAULT", nextStepId: rejectionStep.id, priority: 3 },
      ],
    });

    // Rules for CEO Approval (proceeds to Finance)
    await prisma.rule.create({
      data: { stepId: ceoStep.id, condition: "DEFAULT", nextStepId: financeStep.id, priority: 1 },
    });

    // ── Workflow 2: Employee Onboarding ────────────────────────
    const onboardingWf = await prisma.workflow.create({
      data: {
        name: "Employee Onboarding",
        description: "Onboards a new employee through IT setup, HR orientation, and manager introduction.",
        version: 1,
        isActive: true,
        inputSchema: {
          employee_name: { type: "string", required: true },
          department: { type: "string", required: true },
          role: { type: "string", required: true },
          start_date: { type: "string", required: true },
        },
      },
    });

    const [itStep, hrStep, introStep] = await Promise.all([
      prisma.step.create({ data: { workflowId: onboardingWf.id, name: "IT Setup", stepType: "task", order: 1, metadata: { action: "provision_accounts", systems: ["email", "slack", "jira"] } } }),
      prisma.step.create({ data: { workflowId: onboardingWf.id, name: "HR Orientation", stepType: "approval", order: 2, metadata: { assignee: "hr@example.com", duration_hours: 4 } } }),
      prisma.step.create({ data: { workflowId: onboardingWf.id, name: "Manager Introduction", stepType: "notification", order: 3, metadata: { channel: "email", template: "welcome-intro" } } }),
    ]);

    await prisma.workflow.update({
      where: { id: onboardingWf.id },
      data: { startStepId: itStep.id },
    });

    // Rules for IT Setup
    await prisma.rule.create({
      data: { stepId: itStep.id, condition: "DEFAULT", nextStepId: hrStep.id, priority: 1 },
    });

    // Rules for HR Orientation
    await prisma.rule.create({
      data: { stepId: hrStep.id, condition: "DEFAULT", nextStepId: introStep.id, priority: 1 },
    });

    return NextResponse.json({
      message: "Seed data created successfully",
      workflows: [
        { id: expenseWf.id, name: expenseWf.name, steps: 4 },
        { id: onboardingWf.id, name: onboardingWf.name, steps: 3 },
      ],
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/seed — check seed status
export async function GET() {
  const count = await prisma.workflow.count();
  return NextResponse.json({ workflows: count, seeded: count > 0 });
}
