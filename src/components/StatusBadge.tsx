import { ExecutionStatus, StepType } from "@/types/workflow";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  canceled: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: ExecutionStatus | string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status as string] ?? "bg-slate-100 text-slate-600"
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

const stepTypeStyles: Record<StepType, string> = {
  task: "bg-primary/10 text-primary",
  approval: "bg-warning/10 text-warning",
  notification: "bg-success/10 text-success",
};

export function StepTypeBadge({ type }: { type: StepType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        stepTypeStyles[type]
      )}
    >
      {type}
    </span>
  );
}
