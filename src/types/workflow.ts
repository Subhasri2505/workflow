export enum ExecutionStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELED = "canceled",
}

export type StepType = "task" | "approval" | "notification";

export interface InputSchemaField {
  type: "string" | "number" | "boolean";
  required?: boolean;
  allowed_values?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  input_schema: Record<string, InputSchemaField>;
  is_active: boolean;
  version: number;
  steps: Step[];
  startStepId?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Step {
  id: string;
  workflowId: string;
  name: string;
  type: StepType;
  metadata?: Record<string, any>;
  rules: Rule[];
  order: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Rule {
  id: string;
  stepId: string;
  condition: string;
  nextStepId?: string | null;
  priority: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Execution {
  id: string;
  workflowId: string;
  workflowName?: string;
  workflowVersion?: number;
  status: ExecutionStatus;
  data: Record<string, any>;
  triggeredBy: string;
  logs: ExecutionLog[];
  retries?: number;
  approvals?: string[];
  currentStepId?: string | null;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  updatedAt?: Date;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  stepId?: string;
  message: string;
  type: "info" | "error" | "warning" | "success";
  timestamp: Date;
  ruleCriteria?: RuleEvaluation[];
}

export interface RuleEvaluation {
  ruleId: string;
  condition: string;
  result: boolean;
  evaluatedAt: Date;
}
