"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge, StepTypeBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, Play, CheckCircle, XCircle, Clock, RefreshCw, Ban } from "lucide-react";

interface Field { type: string; required: boolean; allowed_values?: string[]; }
interface Workflow {
  id: string; name: string; version: number;
  inputSchema: Record<string, Field>; steps: any[];
}
interface Execution {
  id: string; status: string; data: any; currentStepId: string | null;
  workflowName: string; workflowVersion: number; triggeredBy: string;
  startedAt: string; endedAt: string | null; retries: number;
  logs: any[];
}

export default function ExecutionPage() {
  const params = useParams();
  const id = params?.id as string;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [inputData, setInputData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/workflows/${id}`).then((r) => r.json()).then(setWorkflow);
  }, [id]);

  const fetchExecution = useCallback(async (execId: string) => {
    const res = await fetch(`/api/executions/${execId}`);
    if (res.ok) {
      const data: Execution = await res.json();
      setExecution(data);
      return data;
    }
    return null;
  }, []);

  // Auto-poll when execution is in a non-terminal state
  useEffect(() => {
    if (!execution) return;
    const isTerminal = ["completed", "failed", "canceled"].includes(execution.status);
    if (isTerminal) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setPolling(false);
    }
  }, [execution]);

  const startPolling = (execId: string) => {
    setPolling(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const data = await fetchExecution(execId);
      if (data && ["completed", "failed", "canceled"].includes(data.status)) {
        clearInterval(pollRef.current!); pollRef.current = null; setPolling(false);
      }
    }, 2000);
  };

  const handleExecute = async () => {
    if (!workflow) return;
    
    // Validation
    const newErrors: Record<string, string> = {};
    for (const [key, field] of Object.entries(workflow.inputSchema) as [string, Field][]) {
      const val = inputData[key] ?? "";
      if (field.required && String(val).trim() === "") {
        newErrors[key] = "This field is required";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setExecuting(true);
    const data: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(workflow.inputSchema) as [string, Field][]) {
      const val = inputData[key] ?? "";
      if (field.type === "number") data[key] = Number(val);
      else if (field.type === "boolean") data[key] = val === "true";
      else data[key] = val;
    }
    try {
      const res = await fetch(`/api/workflows/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, triggeredBy: "current-user" }),
      });
      if (res.ok) {
        const exec: Execution = await res.json();
        setExecution(exec);
        if (!["completed", "failed", "canceled"].includes(exec.status)) {
          startPolling(exec.id);
        }
      }
    } finally {
      setExecuting(false);
    }
  };

  const handleApprove = async () => {
    if (!execution) return;
    const res = await fetch(`/api/executions/${execution.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approverId: "current-user" }),
    });
    if (res.ok) {
      const updated: Execution = await res.json();
      setExecution(updated);
      if (!["completed", "failed", "canceled"].includes(updated.status)) startPolling(updated.id);
    }
  };

  const handleReject = async () => {
    if (!execution) return;
    const res = await fetch(`/api/executions/${execution.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approverId: "current-user" }),
    });
    if (res.ok) setExecution(await res.json());
  };

  const handleCancel = async () => {
    if (!execution) return;
    const res = await fetch(`/api/executions/${execution.id}/cancel`, { method: "POST" });
    if (res.ok) setExecution(await res.json());
  };

  const handleRetry = async () => {
    if (!execution) return;
    const res = await fetch(`/api/executions/${execution.id}/retry`, { method: "POST" });
    if (res.ok) {
      const updated: Execution = await res.json();
      setExecution(updated);
      if (!["completed", "failed", "canceled"].includes(updated.status)) startPolling(updated.id);
    }
  };

  const stepIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  if (!workflow) return <AppLayout><div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div></AppLayout>;

  const currentStepName = execution?.currentStepId
    ? workflow.steps.find((s: any) => s.id === execution.currentStepId)?.name
    : null;

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Workflows</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/workflows/${workflow.id}/edit`} className="hover:text-foreground transition-colors">{workflow.name}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Execute</span>
        </div>

        <h1 className="mb-6 text-lg font-semibold text-foreground">Execute: {workflow.name}</h1>

        {!execution ? (
          <div>
            <div className="mb-4 space-y-3">
              {Object.keys(workflow.inputSchema).length === 0 ? (
                <p className="text-sm text-muted-foreground">No input schema. You can still execute it.</p>
              ) : (
                Object.entries(workflow.inputSchema).map(([key, field]: [string, Field]) => (
                  <div key={key}>
                    <Label className="text-sm">
                      {key} <span className="text-xs text-muted-foreground">({field.type})</span>
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.allowed_values ? (
                      <select
                        className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm ${errors[key] ? "border-red-500 focus-visible:ring-red-500 shadow-sm text-red-900" : "border-slate-300"}`}
                        value={inputData[key] ?? ""}
                        onChange={(e) => {
                          setInputData((d) => ({ ...d, [key]: e.target.value }));
                          if (errors[key]) setErrors((err) => ({ ...err, [key]: "" }));
                        }}
                      >
                        <option value="">Select…</option>
                        {field.allowed_values.map((v: string) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <Input
                        type={field.type === "number" ? "number" : "text"}
                        value={inputData[key] ?? ""}
                        onChange={(e) => {
                          setInputData((d) => ({ ...d, [key]: e.target.value }));
                          if (errors[key]) setErrors((err) => ({ ...err, [key]: "" }));
                        }}
                        placeholder={`Enter ${key}`}
                        className={errors[key] ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                    )}
                    {errors[key] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[key]}</p>}
                  </div>
                ))
              )}
            </div>
            <Button onClick={handleExecute} disabled={executing} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors h-10 px-6">
              <Play className="mr-2 h-4 w-4 shrink-0" /> {executing ? "Starting…" : "Start Execution"}
            </Button>
          </div>
        ) : (
          <div>
            {/* Status bar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <StatusBadge status={execution.status} />
              <span className="text-xs text-muted-foreground font-mono">ID: {execution.id.slice(0, 8)}</span>
              {polling && <span className="text-xs text-muted-foreground animate-pulse">Refreshing…</span>}
              <div className="flex gap-2 ml-auto">
                {execution.status === "pending" && execution.currentStepId && (
                  <>
                    <Button size="sm" onClick={handleApprove}>
                      <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleReject}>
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                {["in_progress", "pending"].includes(execution.status) && (
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <Ban className="mr-1 h-3.5 w-3.5" /> Cancel
                  </Button>
                )}
                {execution.status === "failed" && (
                  <Button size="sm" variant="outline" onClick={handleRetry}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry ({execution.retries} so far)
                  </Button>
                )}
              </div>
            </div>

            {/* Waiting for approval indicator */}
            {execution.status === "pending" && currentStepName && (
              <div className="mb-4 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
                <span className="text-sm font-medium text-foreground">⏳ Waiting for approval: {currentStepName}</span>
                <p className="text-xs text-muted-foreground mt-0.5">Click Approve or Reject above to continue.</p>
              </div>
            )}

            {/* Execution Logs */}
            <h2 className="mb-3 text-sm font-medium text-foreground">Execution Logs</h2>
            <div className="space-y-2">
              {execution.logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No logs yet.</p>
              ) : (
                execution.logs.map((log: any, i: number) => (
                  <div key={i} className="rounded-md border px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      {stepIcon(log.status)}
                      <span className="text-sm font-medium text-foreground">[Step {i + 1}] {log.stepName}</span>
                      <StepTypeBadge type={log.stepType} />
                      <StatusBadge status={log.status} />
                    </div>
                    {log.evaluatedRules && log.evaluatedRules.length > 0 && (
                      <div className="mb-2 space-y-0.5">
                        <span className="text-xs text-muted-foreground">Rules evaluated:</span>
                        {log.evaluatedRules.map((r: any, j: number) => (
                          <div key={j} className="flex items-start gap-2 text-xs">
                            <span className={r.result ? "text-green-500" : "text-muted-foreground"}>{r.result ? "✓" : "✗"}</span>
                            <code className="font-mono break-all">{r.rule}</code>
                          </div>
                        ))}
                      </div>
                    )}
                    {log.selectedNextStep && (
                      <p className="text-xs text-muted-foreground">
                        → Next: {workflow.steps.find((s: any) => s.id === log.selectedNextStep)?.name ?? "End"}
                      </p>
                    )}
                    {log.approverId && <p className="text-xs text-muted-foreground">Approver: {log.approverId}</p>}
                    {log.errorMessage && <p className="text-xs text-destructive">{log.errorMessage}</p>}
                    {log.startedAt && log.endedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Duration: {Math.max(1, new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime())}ms
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setExecution(null)}>
                New Execution
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
