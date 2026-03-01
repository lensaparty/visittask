import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  const adminUser = await getCurrentUser();

  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (adminUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const [outletCount, assignmentCount, taskCount] = await Promise.all([
    prisma.outlet.count(),
    prisma.assignment.count(),
    prisma.task.count(),
  ]);

  const deleted = await prisma.outlet.deleteMany();

  return NextResponse.json({
    deletedOutlets: deleted.count,
    clearedAssignments: assignmentCount,
    clearedTasks: taskCount,
    previousOutlets: outletCount,
  });
}
