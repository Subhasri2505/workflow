import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { ExecutionStatus, type Workflow, type Step, type Rule, type Execution, type ExecutionLog } from "@/types/workflow";

interface WorkflowStore {
  workflows: Workflow[];
  executions: Execution[];
  
  // Workflow actions
  createWorkflow: (name: string, inputSchema: any) => Workflow;
  deleteWorkflow: (id: string) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Workflow;
  
  // Step actions
  addStep: (workflowId: string, name: string, type: string, metadata: any) => Step;
  updateStep: (id: string, updates: Partial<Step>) => void;
  deleteStep: (id: string) => void;
  
  // Rule actions
  addRule: (stepId: string, condition: string, nextStepId: string | null, priority: number) => Rule;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  deleteRule: (id: string) => void;
  
  // Execution actions
  executeWorkflow: (workflowId: string, data: any, triggeredBy: string) => Execution;
  approveStep: (executionId: string, approverId: string) => void;
  rejectStep: (executionId: string, approverId: string) => void;
  cancelExecution: (id: string) => void;
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      workflows: [],
      executions: [],

      createWorkflow: (name, inputSchema) => {
        const newObj: Workflow = {
          id: uuidv4(),
          name,
          input_schema: inputSchema,
          is_active: true,
          version: 1,
          steps: [],
          description: null,
          startStepId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ workflows: [...state.workflows, newObj] }));
        return newObj;
      },

      deleteWorkflow: (id) =>
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== id),
        })),

      updateWorkflow: (id, updates) => {
        let updated: Workflow | undefined;
        set((state) => ({
          workflows: state.workflows.map((w) => {
            if (w.id === id) {
              updated = { ...w, ...updates };
              return updated;
            }
            return w;
          }),
        }));
        return updated!;
      },

      addStep: (workflowId, name, type, metadata) => {
        const newStep: Step = {
          id: uuidv4(),
          workflowId,
          name,
          type: type as any,
          metadata,
          order: 0,
          rules: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          workflows: state.workflows.map((w) => {
            if (w.id === workflowId) {
              const order = w.steps && w.steps.length > 0 ? Math.max(...w.steps.map(s => s.order)) + 1 : 1;
              newStep.order = order;
              return { ...w, steps: [...(w.steps || []), newStep] };
            }
            return w;
          }),
        }));
        return newStep;
      },

      updateStep: (id, updates) =>
        set((state) => ({
          workflows: state.workflows.map((w) => ({
            ...w,
            steps: w.steps?.map((s) => (s.id === id ? { ...s, ...updates } : s)),
          })),
        })),

      deleteStep: (id) =>
        set((state) => ({
          workflows: state.workflows.map((w) => ({
            ...w,
            steps: w.steps?.filter((s) => s.id !== id),
          })),
        })),

      addRule: (stepId, condition, nextStepId, priority) => {
        const newRule: Rule = {
          id: uuidv4(),
          stepId,
          condition,
          nextStepId,
          priority,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          workflows: state.workflows.map((w) => ({
            ...w,
            steps: w.steps?.map((s) =>
              s.id === stepId ? { ...s, rules: [...(s.rules || []), newRule] } : s
            ),
          })),
        }));
        return newRule;
      },

      updateRule: (id, updates) =>
        set((state) => ({
          workflows: state.workflows.map((w) => ({
            ...w,
            steps: w.steps?.map((s) => ({
              ...s,
              rules: s.rules?.map((r) => (r.id === id ? { ...r, ...updates } : r)),
            })),
          })),
        })),

      deleteRule: (id) =>
        set((state) => ({
          workflows: state.workflows.map((w) => ({
            ...w,
            steps: w.steps?.map((s) => ({
              ...s,
              rules: s.rules?.filter((r) => r.id !== id),
            })),
          })),
        })),

      executeWorkflow: (workflowId, data, triggeredBy) => {
        const w = get().workflows.find((x) => x.id === workflowId);
        const newExec: Execution = {
          id: uuidv4(),
          workflowId,
          workflowName: w?.name || "Unknown",
          workflowVersion: w?.version || 1,
          status: ExecutionStatus.IN_PROGRESS,
          data,
          currentStepId: w?.startStepId,
          triggeredBy,
          logs: [],
          retries: 0,
          createdAt: new Date(),
          startedAt: new Date(),
          endedAt: undefined,
        };
        set((state) => ({
          executions: [...state.executions, newExec],
        }));
        return newExec;
      },

      approveStep: (executionId, approverId) =>
        set((state) => ({
          executions: state.executions.map((e) =>
            e.id === executionId ? { ...e, status: ExecutionStatus.COMPLETED } : e
          ),
        })),

      rejectStep: (executionId, approverId) =>
        set((state) => ({
          executions: state.executions.map((e) =>
            e.id === executionId ? { ...e, status: ExecutionStatus.FAILED } : e
          ),
        })),

      cancelExecution: (id) =>
        set((state) => ({
          executions: state.executions.map((e) =>
            e.id === id ? { ...e, status: ExecutionStatus.CANCELED, endedAt: new Date() } : e
          ),
        })),

      addExecution: (exec) =>
        set((state) => ({
          executions: [...state.executions, exec],
        })),

      updateExecution: (id, updates) =>
        set((state) => ({
          executions: state.executions.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
    }),
    {
      name: "workflow-storage",
    }
  )
);
