import { useState } from "react";
import { Step, Workflow, Rule } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Trash2, Pencil } from "lucide-react";

interface Props {
  step: Step;
  workflow: Workflow;
  onClose: () => void;
}

export function StepRuleEditor({ step, workflow, onClose }: Props) {
  const { addRule, updateRule, deleteRule } = useWorkflowStore();
  const [condition, setCondition] = useState("");
  const [nextStepId, setNextStepId] = useState<string | null>(null);
  const [priority, setPriority] = useState(step.rules.length + 1);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const otherSteps = workflow.steps.filter((s) => s.id !== step.id);

  const handleSave = () => {
    if (!condition.trim()) return;
    if (editingRuleId) {
      updateRule(editingRuleId, {
        condition,
        nextStepId,
        priority,
      });
      setEditingRuleId(null);
    } else {
      addRule(step.id, condition, nextStepId, priority);
    }
    setCondition("");
    setNextStepId(null);
    setPriority(step.rules.length + 2);
  };

  const handleEdit = (ruleId: string) => {
    const rule = step.rules.find((r) => r.id === ruleId);
    if (!rule) return;
    setCondition(rule.condition);
    setNextStepId(rule.nextStepId);
    setPriority(rule.priority);
    setEditingRuleId(ruleId);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Rules: {step.name}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Existing rules */}
      <div className="mb-4 space-y-1.5">
        {step.rules
          .sort((a: Rule, b: Rule) => a.priority - b.priority)
          .map((rule) => {
            const nextStep = workflow.steps.find(
              (s) => s.id === rule.nextStepId
            );
            return (
              <div key={rule.id} className="rounded border px-3 py-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-muted-foreground">
                    Priority {rule.priority}
                  </span>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleEdit(rule.id)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                <code className="block text-foreground mb-1">
                  {rule.condition}
                </code>
                <span className="text-muted-foreground">
                  →{" "}
                  {nextStep
                    ? nextStep.name
                    : rule.nextStepId
                      ? "Unknown"
                      : "End workflow"}
                </span>
              </div>
            );
          })}
        {step.rules.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            No rules defined. Steps without rules will proceed to the next step
            by order.
          </p>
        )}
      </div>

      {/* Add rule form */}
      <div className="space-y-2.5 border-t pt-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {editingRuleId ? "Edit Rule" : "Add Rule"}
        </h4>
        <div>
          <Label className="text-xs">Condition</Label>
          <Input
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="amount > 100 && country == 'US'"
            className="text-xs font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">Next Step</Label>
          <Select
            value={nextStepId ?? "__end__"}
            onValueChange={(v) => setNextStepId(v === "__end__" ? null : v)}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select next step" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__end__">End Workflow</SelectItem>
              {otherSteps.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            min={1}
            className="text-xs"
          />
        </div>
        <div className="flex gap-2">
          {editingRuleId && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setEditingRuleId(null);
                setCondition("");
                setNextStepId(null);
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs"
            onClick={handleSave}
            disabled={!condition.trim()}
          >
            <Plus className="mr-1 h-3 w-3" />
            {editingRuleId ? "Update" : "Add Rule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
