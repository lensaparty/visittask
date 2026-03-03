import { TaskStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startOfUtcDay } from "@/lib/schedule";
import { getCurrentUser } from "@/lib/session";

const suspendSchema = z
  .object({
    visualPposm: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    ukuran: z.string().trim().optional(),
  })
  .refine(
    (value) => Boolean(value.visualPposm || value.brand || value.ukuran),
    "Provide at least one filter.",
  );

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (currentUser.role !== UserRole.FIELD_FORCE) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = suspendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Provide at least one of `visualPposm`, `brand`, or `ukuran`." },
      { status: 400 },
    );
  }

  const visualPposm = parsed.data.visualPposm || undefined;
  const brand = parsed.data.brand || undefined;
  const ukuran = parsed.data.ukuran || undefined;

  const matchingAssignments = await prisma.assignment.findMany({
    where: {
      userId: currentUser.id,
      active: true,
      outlet: {
        ...(visualPposm ? { visualPposm } : {}),
        ...(brand ? { brand } : {}),
        ...(ukuran ? { size: ukuran } : {}),
      },
    },
    select: {
      id: true,
      outletId: true,
      outlet: {
        select: {
          storeCode: true,
        },
      },
    },
  });

  if (matchingAssignments.length === 0) {
    return NextResponse.json({
      suspendedCount: 0,
      message: "Tidak ada outlet aktif yang cocok dengan filter asset tersebut.",
    });
  }

  const assignmentIds = matchingAssignments.map((assignment) => assignment.id);
  const outletIds = matchingAssignments.map((assignment) => assignment.outletId);
  const today = startOfUtcDay(new Date());

  await prisma.$transaction([
    prisma.assignment.updateMany({
      where: {
        id: {
          in: assignmentIds,
        },
      },
      data: {
        active: false,
      },
    }),
    prisma.task.deleteMany({
      where: {
        userId: currentUser.id,
        outletId: {
          in: outletIds,
        },
        status: TaskStatus.PENDING,
        scheduledDate: {
          gte: today,
        },
      },
    }),
  ]);

  return NextResponse.json({
    suspendedCount: matchingAssignments.length,
    outletCodes: matchingAssignments.map((assignment) => assignment.outlet.storeCode),
  });
}
