import { useWorkflowStore } from "@/store/workflowStore";

export function seedSampleData() {
  const store = useWorkflowStore.getState();

  // Only seed if no workflows exist
  if (store.workflows.length > 0) return;

  // Create Expense Approval workflow
  const workflow = store.createWorkflow("Expense Approval", {
    amount: { type: "number", required: true },
    country: { type: "string", required: true },
    department: { type: "string", required: false },
    priority: {
      type: "string",
      required: true,
      allowed_values: ["High", "Medium", "Low"],
    },
  });

  // Add steps
  const step1 = store.addStep(workflow.id, "Manager Approval", "approval", {
    assignee_email: "manager@example.com",
  });
  const step2 = store.addStep(
    workflow.id,
    "Finance Notification",
    "notification",
    { channel: "email", template: "finance_review" }
  );
  const step3 = store.addStep(workflow.id, "CEO Approval", "approval", {
    assignee_email: "ceo@example.com",
  });
  const step4 = store.addStep(workflow.id, "Task Completion", "task", {
    action: "mark_complete",
  });
  const step5 = store.addStep(workflow.id, "Task Rejection", "task", {
    action: "mark_rejected",
  });

  // Refresh to get step IDs from store
  const updatedWorkflow = useWorkflowStore
    .getState()
    .workflows.find((w) => w.id === workflow.id)!;
  const steps = updatedWorkflow.steps;
  const s1 = steps.find((s) => s.name === "Manager Approval")!;
  const s2 = steps.find((s) => s.name === "Finance Notification")!;
  const s3 = steps.find((s) => s.name === "CEO Approval")!;
  const s4 = steps.find((s) => s.name === "Task Completion")!;
  const s5 = steps.find((s) => s.name === "Task Rejection")!;

  // Rules for Manager Approval step
  store.addRule(
    s1.id,
    "amount > 100 && country == 'US' && priority == 'High'",
    s2.id,
    1
  );
  store.addRule(s1.id, "amount <= 100", s4.id, 2);
  store.addRule(s1.id, "priority == 'Low' && country != 'US'", s5.id, 3);
  store.addRule(s1.id, "DEFAULT", s5.id, 4);

  // Rules for Finance Notification step
  store.addRule(s2.id, "amount > 500", s3.id, 1);
  store.addRule(s2.id, "DEFAULT", s4.id, 2);

  // Rules for CEO Approval step
  store.addRule(s3.id, "DEFAULT", s4.id, 1);
}
