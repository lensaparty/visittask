import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { distanceInMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const coordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
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
      { message: "Coordinates are required." },
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
    },
  });

  if (!task) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  if (task.checkInAt) {
    return NextResponse.json(
      { message: "Task is already checked in." },
      { status: 409 },
    );
  }

  const distance = distanceInMeters(
    parsed.data.latitude,
    parsed.data.longitude,
    task.outlet.latitude,
    task.outlet.longitude,
  );

  if (distance > 100) {
    return NextResponse.json(
      {
        message: "You must be within 100 meters to check in.",
        distanceMeters: Math.round(distance),
      },
      { status: 422 },
    );
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "CHECKED_IN",
      checkInAt: new Date(),
      checkInLat: parsed.data.latitude,
      checkInLon: parsed.data.longitude,
      checkInDistanceMeters: distance,
    },
  });

  return NextResponse.json({
    ok: true,
    distanceMeters: Math.round(distance),
  });
}
