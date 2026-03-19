"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { StepTypeBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronRight, Plus, Pencil, Trash2, GripVertical, ArrowLeft, X, Save } from "lucide-react";

type StepType = "task" | "approval" | "notification";

interface Rule { id: string; condition: string; nextStepId: string | null; priority: number; }
interface Step { id: string; name: string; stepType: string; order: number; metadata: any; rules: Rule[]; }
interface InputSchemaField { type: string; required: boolean; allowed_values?: string[]; }
interface Workflow {
  id: string; name: string; description: string | null;
  version: number; isActive: boolean; startStepId: string | null;
  inputSchema: Record<string, InputSchemaField>; steps: Step[];
}

export default function WorkflowEditorPage() {
  const params = useParams();
  const id = params?.id as string;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step form
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepName, setStepName] = useState("");
  const [stepType, setStepType] = useState<StepType>("task");
  const [stepMetaJson, setStepMetaJson] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Schema form
  const [showSchemaDialog, setShowSchemaDialog] = useState(false);
  const [schemaField, setSchemaField] = useState("");
  const [schemaType, setSchemaType] = useState("string");
  const [schemaRequired, setSchemaRequired] = useState(true);
  const [schemaAllowed, setSchemaAllowed] = useState("");

  // Rule form (inline in Rule Panel)
  const [condition, setCondition] = useState("");
  const [nextStepId, setNextStepId] = useState<string | null>(null);
  const [rulePriority, setRulePriority] = useState(1);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchWorkflow = useCallback(async () => {
    const res = await fetch(`/api/workflows/${id}`);
    if (res.ok) setWorkflow(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  const saveWorkflowMeta = async (patch: Partial<Workflow>) => {
    setSaving(true);
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    fetchWorkflow();
  };

  // ── Steps ────────────────────────────────────────
  const handleAddStep = async () => {
    const newErrors: Record<string, string> = {};
    if (!stepName.trim()) newErrors.stepName = "Step name is required";
    else if (workflow?.steps.some((s) => s.name.toLowerCase() === stepName.trim().toLowerCase() && s.id !== editingStepId)) {
      newErrors.stepName = "Step name already exists";
    }

    let meta: Record<string, any> = {};
    if (stepMetaJson.trim()) {
      try { 
        meta = JSON.parse(stepMetaJson); 
      } catch { 
        newErrors.stepMetaJson = "Invalid JSON format";
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    if (editingStepId) {
      await fetch(`/api/steps/${editingStepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: stepName.trim(), stepType, metadata: meta }),
      });
    } else {
      await fetch(`/api/workflows/${id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: stepName.trim(), stepType, metadata: meta }),
      });
    }
    setStepName(""); setStepType("task"); setStepMetaJson(""); setEditingStepId(null); setShowAddStep(false);
    fetchWorkflow();
  };

  const handleEditStep = (step: Step) => {
    setStepName(step.name);
    setStepType(step.stepType as StepType);
    setStepMetaJson(step.metadata && Object.keys(step.metadata).length > 0 ? JSON.stringify(step.metadata, null, 2) : "");
    setEditingStepId(step.id);
    setShowAddStep(true);
  };

  const handleDeleteStep = async (stepId: string) => {
    await fetch(`/api/steps/${stepId}`, { method: "DELETE" });
    if (selectedStepId === stepId) setSelectedStepId(null);
    fetchWorkflow();
  };

  // ── Schema ────────────────────────────────────────
  const handleAddSchema = async () => {
    if (!workflow) return;
    const newErrors: Record<string, string> = {};
    const fieldName = schemaField.trim();
    
    if (!fieldName) {
      newErrors.schemaField = "Field name is required";
    } else if (!/^[a-zA-Z0-9_]+$/.test(fieldName)) {
      newErrors.schemaField = "Only alphanumeric chars and underscores allowed";
    } else if (workflow.inputSchema && workflow.inputSchema[fieldName]) {
      newErrors.schemaField = "Field name already exists";
    }

    let allowedValuesArray: string[] | undefined;
    if (schemaAllowed.trim()) {
      const parts = schemaAllowed.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length === 0) {
        newErrors.schemaAllowed = "Provide comma-separated values";
      } else {
        allowedValuesArray = parts;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    const field: InputSchemaField = { type: schemaType, required: schemaRequired };
    if (allowedValuesArray) field.allowed_values = allowedValuesArray;
    
    const newSchema = { ...workflow.inputSchema, [fieldName]: field };
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputSchema: newSchema }),
    });
    setSchemaField(""); setSchemaType("string"); setSchemaRequired(true); setSchemaAllowed(""); setShowSchemaDialog(false);
    fetchWorkflow();
  };

  const handleRemoveSchemaField = async (key: string) => {
    if (!workflow) return;
    const newSchema = { ...workflow.inputSchema };
    delete newSchema[key];
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputSchema: newSchema }),
    });
    fetchWorkflow();
  };

  // ── Rules ─────────────────────────────────────────
  const selectedStep = workflow?.steps.find((s) => s.id === selectedStepId);

  const handleSaveRule = async () => {
    if (!selectedStepId) return;
    const newErrors: Record<string, string> = {};
    if (!condition.trim()) newErrors.condition = "Condition cannot be empty";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    if (editingRuleId) {
      await fetch(`/api/rules/${editingRuleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: condition.trim(), nextStepId, priority: rulePriority }),
      });
      setEditingRuleId(null);
    } else {
      await fetch(`/api/steps/${selectedStepId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: condition.trim(), nextStepId, priority: rulePriority }),
      });
    }
    setCondition(""); setNextStepId(null); setRulePriority((selectedStep?.rules.length ?? 0) + 2);
    fetchWorkflow();
  };

  const handleEditRule = (rule: Rule) => {
    setCondition(rule.condition);
    setNextStepId(rule.nextStepId);
    setRulePriority(rule.priority);
    setEditingRuleId(rule.id);
  };

  const handleDeleteRule = async (ruleId: string) => {
    await fetch(`/api/rules/${ruleId}`, { method: "DELETE" });
    fetchWorkflow();
  };

  if (loading) {
    return <AppLayout><div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div></AppLayout>;
  }
  if (!workflow) {
    return <AppLayout><div className="flex h-full items-center justify-center text-muted-foreground">Workflow not found</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Main editor */}
        <div className="flex-1 overflow-auto p-6">
          {/* Breadcrumb & Header */}
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900 transition-colors">Workflows</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-slate-900 font-medium">{workflow.name}</span>
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <Input
                    value={workflow.name}
                    onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
                    onBlur={() => saveWorkflowMeta({ name: workflow.name })}
                    className="border-transparent hover:border-slate-200 p-0 text-3xl font-bold tracking-tight shadow-none h-auto rounded-md focus-visible:ring-1 focus-visible:ring-blue-500 bg-transparent px-2 -ml-2"
                  />
                  <span className="text-sm text-slate-400 font-medium mt-1">v{workflow.version}</span>
                  {saving && <span className="text-xs text-slate-400 mt-1">Saving…</span>}
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-9 px-4 font-medium shadow-sm bg-white" asChild>
                <Link href={`/workflows/${workflow.id}/execute`}>
                  Execute <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Input Schema */}
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Input Schema</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowSchemaDialog(true)} className="text-slate-600 hover:text-slate-900 font-medium">
                <Plus className="mr-1.5 h-4 w-4" /> Add Field
              </Button>
            </div>
            
            <div>
              {Object.keys(workflow.inputSchema).length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 rounded-lg border border-dashed border-slate-200">
                  No input fields. Add fields to define what data this workflow requires.
                </div>
              ) : (
                <div className="space-y-0">
                  {Object.entries(workflow.inputSchema).map(([key, field]: [string, InputSchemaField]) => (
                    <div key={key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 group">
                      <div className="flex items-center gap-4">
                        <code className="text-sm font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded">{key}</code>
                        <span className="text-sm text-slate-500">{field.type}</span>
                        {field.required && <span className="text-sm text-red-500">required</span>}
                        {field.allowed_values && (
                          <span className="text-sm text-slate-400">[{field.allowed_values.join(" | ")}]</span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveSchemaField(key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Steps</h2>
              <Button variant="ghost" size="sm" onClick={() => { setEditingStepId(null); setStepName(""); setStepType("task"); setStepMetaJson(""); setShowAddStep(true); }} className="text-slate-600 hover:text-slate-900 font-medium">
                <Plus className="mr-1.5 h-4 w-4" /> Add Step
              </Button>
            </div>
            <div className="space-y-3">
              {workflow.steps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
                  No steps yet. Add your first step.
                </div>
              ) : (
                [...workflow.steps].sort((a: Step, b: Step) => a.order - b.order).map((step: Step, i: number) => (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between rounded-xl border px-5 py-4 transition-all duration-200 cursor-pointer shadow-sm ${selectedStepId === step.id ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-100" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"}`}
                    onClick={() => setSelectedStepId(selectedStepId === step.id ? null : step.id)}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-slate-300" />
                      <span className="text-sm font-medium text-slate-400 w-5">{i + 1}.</span>
                      <span className="text-base font-semibold text-slate-900">{step.name}</span>
                      <StepTypeBadge type={step.stepType as any} />
                      <span className="text-sm text-slate-500 ml-2">{step.rules.length} rule{step.rules.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }} onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full" onClick={() => handleEditStep(step)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-full" onClick={() => handleDeleteStep(step.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Rule Editor Panel */}
        {selectedStep && (
          <div className="w-96 border-l bg-card overflow-auto flex-shrink-0">
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Rules: {selectedStep.name}</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedStepId(null)}><X className="h-4 w-4" /></Button>
              </div>

              {/* Existing rules */}
              <div className="mb-4 space-y-1.5">
                {[...selectedStep.rules].sort((a, b) => a.priority - b.priority).map((rule) => {
                  const nextStep = workflow.steps.find((s) => s.id === rule.nextStepId);
                  return (
                    <div key={rule.id} className="rounded border px-3 py-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-muted-foreground">Priority {rule.priority}</span>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditRule(rule)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteRule(rule.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <code className="block text-foreground mb-1 break-all">{rule.condition}</code>
                      <span className="text-muted-foreground">→ {nextStep ? nextStep.name : rule.nextStepId ? "Unknown" : "End workflow"}</span>
                    </div>
                  );
                })}
                {selectedStep.rules.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">No rules. Workflow proceeds to next step by order.</p>
                )}
              </div>

              {/* Add/Edit rule form */}
              <div className="space-y-2.5 border-t pt-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {editingRuleId ? "Edit Rule" : "Add Rule"}
                </h4>
                <div>
                  <Label className="text-xs">Condition</Label>
                  <Input
                    value={condition}
                    onChange={(e) => { setCondition(e.target.value); if (errors.condition) setErrors({...errors, condition: ""}); }}
                    placeholder="amount > 100 && country == 'US'"
                    className={`text-xs font-mono ${errors.condition ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-blue-500 border-slate-300"}`}
                  />
                  {errors.condition && <p className="text-xs text-red-500 mt-1 font-medium">{errors.condition}</p>}
                  {!errors.condition && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Use DEFAULT to match anything. Supports ==, !=, &lt;, &gt;, &amp;&amp;, ||, contains(), startsWith()
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Next Step</Label>
                  <Select value={nextStepId ?? "__end__"} onValueChange={(v) => setNextStepId(v === "__end__" ? null : v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select next step" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__end__">End Workflow</SelectItem>
                      {workflow.steps.filter((s) => s.id !== selectedStepId).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority (lower = evaluated first)</Label>
                  <Input
                    type="number" value={rulePriority}
                    onChange={(e) => setRulePriority(Number(e.target.value))}
                    min={1} className="text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  {editingRuleId && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEditingRuleId(null); setCondition(""); setNextStepId(null); }}>
                      Cancel
                    </Button>
                  )}
                  <Button size="sm" className="text-xs" onClick={handleSaveRule}>
                    <Plus className="mr-1 h-3 w-3" />{editingRuleId ? "Update" : "Add Rule"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Step Dialog */}
      <Dialog open={showAddStep} onOpenChange={(v) => { if (!v) { setEditingStepId(null); setStepName(""); setErrors({}); } setShowAddStep(v); }}>
        <DialogContent className="sm:max-w-[425px] sm:rounded-xl bg-white">
          <DialogHeader><DialogTitle className="text-xl font-bold text-slate-900">{editingStepId ? "Edit Step" : "Add Step"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800">Step Name <span className="text-red-500">*</span></Label>
              <Input 
                value={stepName} 
                onChange={(e) => { setStepName(e.target.value); if (errors.stepName) setErrors({...errors, stepName: ""}); }} 
                placeholder="e.g. Manager Approval" 
                autoFocus 
                className={errors.stepName ? "border-red-500 focus-visible:ring-red-500 shadow-sm" : "focus-visible:ring-blue-500 border-slate-300 shadow-sm"}
              />
              {errors.stepName && <p className="text-xs text-red-500 font-medium">{errors.stepName}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800">Step Type</Label>
              <Select value={stepType} onValueChange={(v) => setStepType(v as StepType)}>
                <SelectTrigger className="focus:ring-blue-500 border-slate-300 shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800">Metadata (optional JSON)</Label>
              <Textarea
                value={stepMetaJson}
                onChange={(e) => { setStepMetaJson(e.target.value); if (errors.stepMetaJson) setErrors({...errors, stepMetaJson: ""}); }}
                placeholder='{"assignee_email": "..."}'
                className={errors.stepMetaJson ? "font-mono text-sm border-red-500 focus-visible:ring-red-500 shadow-sm" : "font-mono text-sm focus-visible:ring-blue-500 border-slate-300 shadow-sm"}
                rows={2}
              />
              {errors.stepMetaJson && <p className="text-xs text-red-500 font-medium">{errors.stepMetaJson}</p>}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowAddStep(false)} className="border-slate-200 text-slate-700 bg-white shadow-sm font-medium hover:bg-slate-50">Cancel</Button>
            <Button onClick={handleAddStep} className="bg-blue-400 hover:bg-blue-500 text-white font-medium shadow-sm transition-colors">{editingStepId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schema Field Dialog */}
      <Dialog open={showSchemaDialog} onOpenChange={(v) => { if (!v) setErrors({}); setShowSchemaDialog(v); }}>
        <DialogContent className="sm:max-w-[425px] sm:rounded-xl bg-white">
          <DialogHeader><DialogTitle className="text-xl font-bold text-slate-900">Add Input Field</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800">Field Name <span className="text-red-500">*</span></Label>
              <Input 
                value={schemaField} 
                onChange={(e) => { setSchemaField(e.target.value); if (errors.schemaField) setErrors({...errors, schemaField: ""}); }} 
                placeholder="e.g. amount" 
                autoFocus 
                className={errors.schemaField ? "border-red-500 focus-visible:ring-red-500 shadow-sm" : "focus-visible:ring-blue-500 border-slate-300 shadow-sm"} 
              />
              {errors.schemaField && <p className="text-xs text-red-500 font-medium">{errors.schemaField}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800">Type</Label>
              <Select value={schemaType} onValueChange={setSchemaType}>
                <SelectTrigger className="focus:ring-blue-500 border-slate-300 shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-1 pb-1">
              <input type="checkbox" checked={schemaRequired} onChange={(e) => setSchemaRequired(e.target.checked)} className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 h-4 w-4 shrink-0 transition-none" />
              <Label className="cursor-pointer font-medium text-slate-800" onClick={() => setSchemaRequired(!schemaRequired)}>Required</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800">Allowed Values (comma-separated, optional)</Label>
              <Input 
                value={schemaAllowed} 
                onChange={(e) => { setSchemaAllowed(e.target.value); if (errors.schemaAllowed) setErrors({...errors, schemaAllowed: ""}); }} 
                placeholder="High, Medium, Low" 
                className={errors.schemaAllowed ? "border-red-500 focus-visible:ring-red-500 shadow-sm" : "focus-visible:ring-blue-500 border-slate-300 shadow-sm"} 
              />
              {errors.schemaAllowed && <p className="text-xs text-red-500 font-medium">{errors.schemaAllowed}</p>}
            </div>
          </div>
          <DialogFooter className="mt-2 text-right flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSchemaDialog(false)} className="border-slate-200 text-slate-700 bg-white shadow-sm font-medium hover:bg-slate-50">Cancel</Button>
            <Button onClick={handleAddSchema} className="bg-blue-400 hover:bg-blue-500 text-white font-medium shadow-sm transition-colors">Add Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
