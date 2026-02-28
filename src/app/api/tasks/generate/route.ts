import { TaskStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  enumerateDates,
  getWeekType,
  getWeekdayId,
  parseDateInput,
  startOfUtcDay,
  weekdayIdToScheduleDay,
} from "@/lib/schedule";
import { getCurrentUser } from "@/lib/session";

const generateSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
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
      { message: "Provide `from` and `to` in YYYY-MM-DD format." },
      { status: 400 },
    );
  }

  const startDate = parseDateInput(parsed.data.from);
  const endDate = parseDateInput(parsed.data.to);

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
  let skipped = 0;

  for (const date of days) {
    const weekType = getWeekType(date);
    const weekdayId = getWeekdayId(date);
    const scheduleDay = weekdayIdToScheduleDay(weekdayId);

    const assignments = await prisma.assignment.findMany({
      where:
        weekType === "ODD"
          ? {
              active: true,
              outlet: {
                oddScheduleDay: scheduleDay,
              },
            }
          : {
              active: true,
              outlet: {
                evenScheduleDay: scheduleDay,
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

    const result = await prisma.task.createMany({
      data: assignments.map((assignment) => ({
        outletId: assignment.outletId,
        userId: assignment.userId,
        scheduledDate: startOfUtcDay(date),
        weekParity: weekType,
        scheduleDay,
        status: TaskStatus.PENDING,
      })),
      skipDuplicates: true,
    });

    created += result.count;
    skipped += assignments.length - result.count;
  }

  return NextResponse.json({
    created,
    skipped,
  });
}
