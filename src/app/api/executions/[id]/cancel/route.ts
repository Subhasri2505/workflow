export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/executions/:id/cancel
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const execution = await prisma.execution.findUnique({ where: { id } });
  if (!execution) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["pending", "in_progress"].includes(execution.status)) {
    return NextResponse.json(
      { error: `Cannot cancel execution with status '${execution.status}'` },
      { status: 400 }
    );
  }

  const updated = await prisma.execution.update({
    where: { id },
    data: { status: "canceled", endedAt: new Date() },
    include: { logs: true },
  });

  return NextResponse.json(updated);
}
