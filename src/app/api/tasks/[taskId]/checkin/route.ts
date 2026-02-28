import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { haversineDistanceMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const coordinateSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== UserRole.FIELD_FORCE) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = coordinateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Current lat/lon is required." },
      { status: 400 },
    );
  }

  const { taskId } = await context.params;
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: user.id,
    },
    include: {
      outlet: true,
      visit: true,
    },
  });

  if (!task) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  if (task.status === "DONE") {
    return NextResponse.json(
      { message: "This task is already completed." },
      { status: 409 },
    );
  }

  if (task.visit?.checkInTime) {
    return NextResponse.json(
      { message: "This task is already checked in." },
      { status: 409 },
    );
  }

  const distanceM = haversineDistanceMeters(
    parsed.data.lat,
    parsed.data.lon,
    task.outlet.latitude,
    task.outlet.longitude,
  );

  if (distanceM > 100) {
    return NextResponse.json(
      {
        message: "You are too far from the outlet to check in.",
        distanceM: Math.round(distanceM),
      },
      { status: 400 },
    );
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.visit.upsert({
      where: {
        taskId: task.id,
      },
      update: {
        checkInTime: now,
        checkInLat: parsed.data.lat,
        checkInLon: parsed.data.lon,
        checkInDistanceM: distanceM,
      },
      create: {
        taskId: task.id,
        checkInTime: now,
        checkInLat: parsed.data.lat,
        checkInLon: parsed.data.lon,
        checkInDistanceM: distanceM,
      },
    }),
    prisma.task.update({
      where: { id: task.id },
      data: {
        status: "IN_PROGRESS",
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    distanceM: Math.round(distanceM),
  });
}
