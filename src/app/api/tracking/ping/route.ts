import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const pingSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== UserRole.FIELD_FORCE) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid ping payload." },
      { status: 400 },
    );
  }

  const activeSession = await prisma.dutySession.findFirst({
    where: {
      userId: user.id,
      endedAt: null,
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  const pingedAt = parsed.data.timestamp
    ? new Date(parsed.data.timestamp)
    : new Date();

  await prisma.$transaction([
    prisma.locationPing.create({
      data: {
        userId: user.id,
        dutySessionId: activeSession?.id ?? null,
        latitude: parsed.data.lat,
        longitude: parsed.data.lon,
        accuracy: parsed.data.accuracy,
        speed: parsed.data.speed,
        pingedAt,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastKnownLat: parsed.data.lat,
        lastKnownLon: parsed.data.lon,
        lastKnownAccuracy: parsed.data.accuracy ?? null,
        lastPingAt: pingedAt,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
