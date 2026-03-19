export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { approveStep } from "@/lib/workflowEngine";

// POST /api/executions/:id/approve
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { approverId } = await req.json();

  try {
    const execution = await approveStep(id, approverId ?? "system");
    return NextResponse.json(execution);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
