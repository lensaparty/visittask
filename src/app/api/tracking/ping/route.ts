import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const pingSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
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

  const session = await prisma.dutySession.findFirst({
    where: {
      userId: user.id,
      endedAt: null,
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  if (!session) {
    return NextResponse.json(
      { message: "Start duty before sending pings." },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.locationPing.create({
      data: {
        userId: user.id,
        dutySessionId: session.id,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        accuracy: parsed.data.accuracy,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastKnownLat: parsed.data.latitude,
        lastKnownLon: parsed.data.longitude,
        lastKnownAccuracy: parsed.data.accuracy ?? null,
        lastPingAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
