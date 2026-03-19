export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/workflows/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: { steps: { include: { rules: true }, orderBy: { order: "asc" } } },
  });

  if (!workflow)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workflow);
}

// PATCH /api/workflows/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const workflow = await prisma.workflow.update({
    where: { id },
    data: {
      ...body,
      version: { increment: 1 },
    },
    include: { steps: { include: { rules: true } } },
  });
  return NextResponse.json(workflow);
}

// DELETE /api/workflows/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
