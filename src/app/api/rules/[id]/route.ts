export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/rules/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { condition, nextStepId, priority } = body;

  const rule = await prisma.rule.update({
    where: { id },
    data: {
      ...(condition !== undefined && { condition }),
      ...(nextStepId !== undefined && { nextStepId }),
      ...(priority !== undefined && { priority }),
    },
  });
  return NextResponse.json(rule);
}

// DELETE /api/rules/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.rule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
