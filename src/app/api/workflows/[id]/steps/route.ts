export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/workflows/:id/steps
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const steps = await prisma.step.findMany({
    where: { workflowId: id },
    include: { rules: { orderBy: { priority: "asc" } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(steps);
}

// POST /api/workflows/:id/steps
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, stepType, order, metadata } = body;

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  // Auto-assign order if not provided
  let stepOrder = order;
  if (stepOrder === undefined || stepOrder === null) {
    const lastStep = await prisma.step.findFirst({
      where: { workflowId: id },
      orderBy: { order: "desc" },
    });
    stepOrder = (lastStep?.order ?? 0) + 1;
  }

  const step = await prisma.step.create({
    data: {
      workflowId: id,
      name,
      stepType: stepType ?? "task",
      order: stepOrder,
      metadata: metadata ?? {},
    },
    include: { rules: true },
  });

  // Set as startStepId if it's the first step
  if (stepOrder === 1 || !workflow.startStepId) {
    const firstStep = await prisma.step.findFirst({
      where: { workflowId: id },
      orderBy: { order: "asc" },
    });
    if (firstStep) {
      await prisma.workflow.update({
        where: { id },
        data: { startStepId: firstStep.id },
      });
    }
  }

  return NextResponse.json(step, { status: 201 });
}
