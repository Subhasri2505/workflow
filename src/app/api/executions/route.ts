export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/executions — fetch all execution logs
export async function GET() {
  const executions = await prisma.execution.findMany({
    include: { logs: { orderBy: { startedAt: "asc" } } },
    orderBy: { startedAt: "desc" },
  });
  return NextResponse.json(executions);
}
