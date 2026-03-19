export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/executions/:id/retry
// Re-executes only the last failed step, not the whole workflow
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
      logs: { orderBy: { startedAt: "desc" } },
      workflow: {
        include: {
          steps: { include: { rules: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!execution) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (execution.status !== "failed") {
    return NextResponse.json(
      { error: "Can only retry failed executions" },
      { status: 400 }
    );
  }

  // Find the last failed step
  const failedLog = execution.logs.find((l: any) => l.status === "failed");
  if (!failedLog) {
    return NextResponse.json({ error: "No failed step found" }, { status: 400 });
  }

  // Reset execution to in_progress at the failed step
  const updated = await prisma.execution.update({
    where: { id },
    data: {
      status: "in_progress",
      currentStepId: failedLog.stepId,
      retries: { increment: 1 },
      endedAt: null,
    },
  });

  // Import and re-run the workflow engine from the failed step
  const { retryFromStep } = await import("@/lib/workflowEngine");
  const result = await retryFromStep(id, failedLog.stepId, execution.data as Record<string, unknown>, execution.workflow);

  return NextResponse.json(result);
}
