import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const reactivateSchema = z
  .object({
    assignmentId: z.string().trim().min(1).optional(),
    assignmentIds: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.assignmentId || value.assignmentIds?.length),
    "Provide at least one assignment id.",
  );

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (currentUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reactivateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Provide `assignmentId` or `assignmentIds`." },
      { status: 400 },
    );
  }

  const assignmentIds = [
    ...(parsed.data.assignmentId ? [parsed.data.assignmentId] : []),
    ...(parsed.data.assignmentIds ?? []),
  ];

  const uniqueAssignmentIds = [...new Set(assignmentIds)];

  const assignments = await prisma.assignment.findMany({
    where: {
      id: {
        in: uniqueAssignmentIds,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      outlet: {
        select: {
          id: true,
          storeCode: true,
          name: true,
        },
      },
    },
  });

  if (assignments.length !== uniqueAssignmentIds.length) {
    return NextResponse.json({ message: "One or more assignments were not found." }, { status: 404 });
  }

  if (assignments.some((assignment) => assignment.user.role !== UserRole.FIELD_FORCE)) {
    return NextResponse.json(
      { message: "Only field force assignments can be reactivated here." },
      { status: 400 },
    );
  }

  if (assignments.some((assignment) => assignment.active)) {
    return NextResponse.json(
      { message: "One or more assignments are already active." },
      { status: 400 },
    );
  }

  await prisma.assignment.updateMany({
    where: {
      id: {
        in: uniqueAssignmentIds,
      },
    },
    data: {
      active: true,
    },
  });

  return NextResponse.json({
    message:
      uniqueAssignmentIds.length === 1
        ? "Assignment reactivated."
        : `${uniqueAssignmentIds.length} assignments reactivated.`,
    reactivatedCount: uniqueAssignmentIds.length,
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      userId: assignment.user.id,
      userName: assignment.user.name,
      kodeToko: assignment.outlet.storeCode,
      namaToko: assignment.outlet.name,
    })),
  });
}
