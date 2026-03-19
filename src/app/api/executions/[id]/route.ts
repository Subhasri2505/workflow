export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/executions/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
      logs: { orderBy: { startedAt: "asc" } },
      workflow: { select: { name: true, version: true } },
    },
  });
  if (!execution) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(execution);
}
