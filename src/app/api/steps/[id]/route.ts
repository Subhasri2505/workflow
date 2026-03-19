export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/steps/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const step = await prisma.step.findUnique({
    where: { id },
    include: { rules: { orderBy: { priority: "asc" } } },
  });
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });
  return NextResponse.json(step);
}

// PUT /api/steps/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, stepType, order, metadata } = body;

  const step = await prisma.step.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(stepType !== undefined && { stepType }),
      ...(order !== undefined && { order }),
      ...(metadata !== undefined && { metadata }),
    },
    include: { rules: true },
  });
  return NextResponse.json(step);
}

// DELETE /api/steps/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const step = await prisma.step.findUnique({ where: { id } });
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  await prisma.step.delete({ where: { id } });

  // Update startStepId if deleted step was the start
  const workflow = await prisma.workflow.findUnique({ where: { id: step.workflowId } });
  if (workflow?.startStepId === id) {
    const firstStep = await prisma.step.findFirst({
      where: { workflowId: step.workflowId },
      orderBy: { order: "asc" },
    });
    await prisma.workflow.update({
      where: { id: step.workflowId },
      data: { startStepId: firstStep?.id ?? null },
    });
  }

  return NextResponse.json({ success: true });
}
