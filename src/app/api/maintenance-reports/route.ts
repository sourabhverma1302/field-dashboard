
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const reports = await prisma.maintenanceReport.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        notes: true,
        reportText: true,
        priority: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      reports.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("Failed to load maintenance reports:", error);

    return NextResponse.json(
      { error: "Failed to load saved reports." },
      { status: 500 },
    );
  }
}
