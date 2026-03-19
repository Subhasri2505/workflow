export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { executeWorkflow } from "@/lib/workflowEngine";

// POST /api/workflows/:id/execute
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { data, triggeredBy } = body;

  try {
    const execution = await executeWorkflow(
      id,
      data,
      triggeredBy ?? "api"
    );
    return NextResponse.json(execution, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
