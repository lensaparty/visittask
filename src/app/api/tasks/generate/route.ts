import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  enumerateDates,
  getScheduleDayFromDate,
  getWeekParity,
  parseDateInput,
  startOfUtcDay,
} from "@/lib/schedule";
import { getCurrentUser } from "@/lib/session";

const generateSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Provide `startDate` and `endDate`." },
      { status: 400 },
    );
  }

  const startDate = parseDateInput(parsed.data.startDate);
  const endDate = parseDateInput(parsed.data.endDate);

  if (!startDate || !endDate || endDate < startDate) {
    return NextResponse.json(
      { message: "Date range is invalid." },
      { status: 400 },
    );
  }

  const days = enumerateDates(startDate, endDate);

  if (days.length > 31) {
    return NextResponse.json(
      { message: "Generate a maximum of 31 days at a time." },
      { status: 400 },
    );
  }

  let created = 0;
  let candidates = 0;

  for (const date of days) {
    const parity = getWeekParity(date);
    const day = getScheduleDayFromDate(date);

    const assignments = await prisma.assignment.findMany({
      where:
        parity === "ODD"
          ? {
              active: true,
              outlet: {
                oddScheduleDay: day,
              },
            }
          : {
              active: true,
              outlet: {
                evenScheduleDay: day,
              },
            },
      select: {
        userId: true,
        outletId: true,
      },
    });

    if (assignments.length === 0) {
      continue;
    }

    candidates += assignments.length;

    const result = await prisma.task.createMany({
      data: assignments.map((assignment) => ({
        outletId: assignment.outletId,
        userId: assignment.userId,
        scheduledDate: startOfUtcDay(date),
        weekParity: parity,
        scheduleDay: day,
      })),
      skipDuplicates: true,
    });

    created += result.count;
  }

  return NextResponse.json({
    created,
    skippedDuplicates: candidates - created,
    totalCandidates: candidates,
  });
}
