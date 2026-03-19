export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/steps/:id/rules
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rules = await prisma.rule.findMany({
    where: { stepId: id },
    orderBy: { priority: "asc" },
  });
  return NextResponse.json(rules);
}

// POST /api/steps/:id/rules
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { condition, nextStepId, priority } = body;

  const step = await prisma.step.findUnique({ where: { id } });
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  // Auto-assign priority if not provided
  let rulePriority = priority;
  if (rulePriority === undefined || rulePriority === null) {
    const lastRule = await prisma.rule.findFirst({
      where: { stepId: id },
      orderBy: { priority: "desc" },
    });
    rulePriority = (lastRule?.priority ?? 0) + 1;
  }

  const rule = await prisma.rule.create({
    data: {
      stepId: id,
      condition,
      nextStepId: nextStepId ?? null,
      priority: rulePriority,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
