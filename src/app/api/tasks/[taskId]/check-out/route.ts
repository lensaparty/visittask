import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
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
  });

  if (!task) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  if (!task.checkInAt) {
    return NextResponse.json(
      { message: "Check in before checking out." },
      { status: 409 },
    );
  }

  if (task.checkOutAt) {
    return NextResponse.json(
      { message: "Task is already checked out." },
      { status: 409 },
    );
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "COMPLETED",
      checkOutAt: new Date(),
      checkOutLat: parsed.data.latitude,
      checkOutLon: parsed.data.longitude,
    },
  });

  return NextResponse.json({ ok: true });
}
