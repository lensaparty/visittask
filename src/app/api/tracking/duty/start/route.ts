import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const optionalCoordinateSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
  })
  .partial();

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== UserRole.FIELD_FORCE) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = optionalCoordinateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid tracking coordinates." },
      { status: 400 },
    );
  }

  const existingSession = await prisma.dutySession.findFirst({
    where: {
      userId: user.id,
      endedAt: null,
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  if (existingSession) {
    return NextResponse.json({ sessionId: existingSession.id, active: true });
  }

  const session = await prisma.dutySession.create({
    data: {
      userId: user.id,
      startedLat: parsed.data.latitude ?? null,
      startedLon: parsed.data.longitude ?? null,
    },
  });

  if (
    typeof parsed.data.latitude === "number" &&
    typeof parsed.data.longitude === "number"
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastKnownLat: parsed.data.latitude,
        lastKnownLon: parsed.data.longitude,
        lastPingAt: new Date(),
      },
    });
  }

  return NextResponse.json({ sessionId: session.id, active: true });
}
