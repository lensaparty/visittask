import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const adminUser = await getCurrentUser();

  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (adminUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();

  if (!userId) {
    return NextResponse.json(
      { message: "Query parameter `userId` is required." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      userId,
    },
    include: {
      outlet: {
        select: {
          id: true,
          storeCode: true,
          name: true,
          territory: true,
        },
      },
    },
    orderBy: {
      outlet: {
        storeCode: "asc",
      },
    },
  });

  return NextResponse.json({
    user,
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      active: assignment.active,
      outletId: assignment.outletId,
      kodeToko: assignment.outlet.storeCode,
      namaToko: assignment.outlet.name,
      territory: assignment.outlet.territory,
    })),
  });
}
