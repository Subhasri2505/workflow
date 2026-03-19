export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/workflows — list all workflows with pagination and search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, workflows] = await Promise.all([
    prisma.workflow.count({ where }),
    prisma.workflow.findMany({
      where,
      include: {
        steps: { include: { rules: true }, orderBy: { order: "asc" } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    data: workflows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/workflows — create a workflow
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, inputSchema } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      inputSchema: inputSchema ?? {},
    },
    include: { steps: { include: { rules: true } } },
  });

  return NextResponse.json(workflow, { status: 201 });
}
