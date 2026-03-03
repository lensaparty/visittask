import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const reactivateSchema = z.object({
  assignmentId: z.string().trim().min(1),
});

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
      { message: "Provide `assignmentId`." },
      { status: 400 },
    );
  }

  const assignment = await prisma.assignment.findUnique({
    where: {
      id: parsed.data.assignmentId,
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

  if (!assignment) {
    return NextResponse.json({ message: "Assignment not found." }, { status: 404 });
  }

  if (assignment.user.role !== UserRole.FIELD_FORCE) {
    return NextResponse.json(
      { message: "Only field force assignments can be reactivated here." },
      { status: 400 },
    );
  }

  if (assignment.active) {
    return NextResponse.json(
      { message: "Assignment is already active." },
      { status: 400 },
    );
  }

  await prisma.assignment.update({
    where: {
      id: assignment.id,
    },
    data: {
      active: true,
    },
  });

  return NextResponse.json({
    message: "Assignment reactivated.",
    assignment: {
      id: assignment.id,
      userId: assignment.user.id,
      userName: assignment.user.name,
      kodeToko: assignment.outlet.storeCode,
      namaToko: assignment.outlet.name,
    },
  });
}
