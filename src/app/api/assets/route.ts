
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            workOrders: true,
            reports: true,
          },
        },
      },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Failed to fetch assets:", error);

    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
    try {
      const body = await request.json();
  
      const assetTag =
        typeof body.assetTag === "string" ? body.assetTag.trim() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const category =
        typeof body.category === "string" ? body.category.trim() : "";
      const location =
        typeof body.location === "string" ? body.location.trim() : "";
  
      if (!assetTag || !name || !category || !location) {
        return NextResponse.json(
          { error: "Asset tag, name, category, and location are required." },
          { status: 400 },
        );
      }
  
      const asset = await prisma.asset.create({
        data: {
          assetTag,
          name,
          category,
          location,
        },
      });
  
      const assetWithCounts = await prisma.asset.findUnique({
        where: { id: asset.id },
        include: {
          _count: {
            select: {
              workOrders: true,
              reports: true,
            },
          },
        },
      });
      
      return NextResponse.json(assetWithCounts, { status: 201 });    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "An asset with this asset tag already exists." },
          { status: 409 },
        );
      }
  
      console.error("Failed to create asset:", error);
  
      return NextResponse.json(
        { error: "Failed to create asset." },
        { status: 500 },
      );
    }
  }
  