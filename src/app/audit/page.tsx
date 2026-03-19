"use client";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StepTypeBadge } from "@/components/StatusBadge";

interface ExecutionLog {
  id: string; stepName: string; stepType: string; status: string;
  evaluatedRules: { rule: string; result: boolean }[];
  selectedNextStep: string | null; approverId: string | null;
  errorMessage: string | null; startedAt: string; endedAt: string | null;
}
interface Execution {
  id: string; workflowName: string; workflowVersion: number;
  status: string; triggeredBy: string; startedAt: string;
  endedAt: string | null; data: any; logs: ExecutionLog[];
}

export default function AuditLogPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExec, setSelectedExec] = useState<Execution | null>(null);

  useEffect(() => {
    fetch("/api/executions")
      .then((r) => r.json())
      .then(setExecutions)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Track all workflow executions</p>
        </div>

        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-card">
                {["Execution ID", "Workflow", "Version", "Status", "Started By", "Start Time", "End Time", "Actions"].map((h) => (
                  <th key={h} className={`px-4 py-2.5 text-left font-medium text-muted-foreground ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : executions.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No executions yet. Execute a workflow to see logs here.</td></tr>
              ) : (
                executions.map((exec) => (
                  <tr key={exec.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{exec.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{exec.workflowName}</td>
                    <td className="px-4 py-3 text-muted-foreground">v{exec.workflowVersion}</td>
                    <td className="px-4 py-3"><StatusBadge status={exec.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{exec.triggeredBy}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(exec.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {exec.endedAt ? new Date(exec.endedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedExec(exec)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View Logs
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedExec} onOpenChange={() => setSelectedExec(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Execution Logs — {selectedExec?.workflowName}</DialogTitle>
          </DialogHeader>
          {selectedExec && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>ID: {selectedExec.id.slice(0, 8)}</span>
                <StatusBadge status={selectedExec.status} />
                <span>v{selectedExec.workflowVersion}</span>
                <span>by {selectedExec.triggeredBy}</span>
              </div>
              <div className="rounded border p-3">
                <span className="text-xs font-medium text-muted-foreground">Input Data:</span>
                <pre className="mt-1 text-xs font-mono text-foreground overflow-auto">{JSON.stringify(selectedExec.data, null, 2)}</pre>
              </div>
              {selectedExec.logs.map((log: ExecutionLog, i: number) => (
                <div key={i} className="rounded border px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">[Step {i + 1}] {log.stepName}</span>
                    <StepTypeBadge type={log.stepType as any} />
                    <StatusBadge status={log.status} />
                  </div>
                  {log.evaluatedRules?.length > 0 && (
                    <div className="text-xs mt-1 space-y-0.5">
                      {log.evaluatedRules.map((r: { rule: string; result: boolean }, j: number) => (
                        <div key={j} className="flex gap-1">
                          <span className={r.result ? "text-green-500" : "text-muted-foreground"}>{r.result ? "✓" : "✗"}</span>
                          <code className="font-mono break-all">{r.rule}</code>
                        </div>
                      ))}
                    </div>
                  )}
                  {log.selectedNextStep && <p className="text-xs text-muted-foreground mt-1">→ Next Step: {log.selectedNextStep.slice(0, 8)}</p>}
                  {log.approverId && <p className="text-xs text-muted-foreground">Approver: {log.approverId}</p>}
                  {log.errorMessage && <p className="text-xs text-destructive">{log.errorMessage}</p>}
                  {log.startedAt && log.endedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration: {Math.max(1, new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime())}ms
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
