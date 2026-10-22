
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const priorityMap = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
} as const;

const statusMap = {
  Open: "OPEN",
  "In Progress": "IN_PROGRESS",
  Completed: "COMPLETED",
} as const;

const reversePriorityMap = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "High",
} as const;

const reverseStatusMap = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "Open",
  COMPLETED: "Completed",
} as const;

function toClientOrder(order: {
  jobId: string;
  title: string;
  description: string;
  assetName: string;
  site: string;
  assignedTechnician: string;
  priority: keyof typeof reversePriorityMap;
  status: keyof typeof reverseStatusMap;
  createdAt: Date;
  completedAt: Date | null;
  asset: { name: string } | null;
}) {
  return {
    jobId: order.jobId,
    title: order.title,
    asset: order.assetName || order.asset?.name || "",
    site: order.site,
    description: order.description,
    priority: reversePriorityMap[order.priority],
    assignedTechnician: order.assignedTechnician,
    status: reverseStatusMap[order.status],
    createdAt: order.createdAt.toISOString(),
    completedAt: order.completedAt?.toISOString() ?? null,
  };
}

function parseOrder(body: Record<string, unknown>) {
  if (
    typeof body.jobId !== "string" ||
    !body.jobId.trim() ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    typeof body.description !== "string"
  ) {
    throw new Error("Each work order needs a job ID, title, and description.");
  }

  const priority =
    typeof body.priority === "string" && body.priority in priorityMap
      ? priorityMap[body.priority as keyof typeof priorityMap]
      : "MEDIUM";

  const status =
    typeof body.status === "string" && body.status in statusMap
      ? statusMap[body.status as keyof typeof statusMap]
      : "OPEN";

  const completedAt =
    status === "COMPLETED"
      ? typeof body.completedAt === "string" &&
        !Number.isNaN(Date.parse(body.completedAt))
        ? new Date(body.completedAt)
        : new Date()
      : null;

  return {
    jobId: body.jobId.trim(),
    title: body.title.trim(),
    description: body.description.trim(),
    assetName: typeof body.asset === "string" ? body.asset.trim() : "",
    site: typeof body.site === "string" ? body.site.trim() : "",
    assignedTechnician:
      typeof body.assignedTechnician === "string"
        ? body.assignedTechnician.trim()
        : "",
    priority,
    status,
    createdAt:
      typeof body.createdAt === "string" &&
      !Number.isNaN(Date.parse(body.createdAt))
        ? new Date(body.createdAt)
        : new Date(),
    completedAt,
  };
}

async function findAssetId(assetName: string): Promise<string | null> {
  if (!assetName) return null;

  const asset = await prisma.asset.findFirst({
    where: {
      OR: [
        { name: { equals: assetName, mode: "insensitive" } },
        { assetTag: { equals: assetName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  return asset?.id ?? null;
}

export async function GET() {
  try {
    const orders = await prisma.workOrder.findMany({
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders.map(toClientOrder));
  } catch (error) {
    console.error("Failed to load work orders:", error);
    return NextResponse.json(
      { error: "Failed to load work orders." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const order = parseOrder(body);
    const assetId = await findAssetId(order.assetName);

    const saved = await prisma.workOrder.create({
      data: {
        ...order,
        assetId,
      },
      include: { asset: true },
    });

    return NextResponse.json(toClientOrder(saved), { status: 201 });
  } catch (error) {
    console.error("Failed to create work order:", error);

    return NextResponse.json(
      { error: "Failed to create work order." },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { orders?: unknown };

    if (!Array.isArray(body.orders)) {
      return NextResponse.json(
        { error: "Expected an orders array." },
        { status: 400 },
      );
    }

    const savedOrders = [];

    for (const item of body.orders) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return NextResponse.json(
          { error: "Invalid work order in request." },
          { status: 400 },
        );
      }

      const order = parseOrder(item as Record<string, unknown>);
      const assetId = await findAssetId(order.assetName);

      const saved = await prisma.workOrder.upsert({
        where: { jobId: order.jobId },
        create: {
          ...order,
          assetId,
        },
        update: {
          ...order,
          assetId,
        },
        include: { asset: true },
      });

      savedOrders.push(toClientOrder(saved));
    }

    return NextResponse.json(savedOrders);
  } catch (error) {
    console.error("Failed to sync work orders:", error);

    return NextResponse.json(
      { error: "Failed to sync work orders." },
      { status: 400 },
    );
  }
}
