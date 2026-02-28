import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const optionalCoordinateSchema = z
  .object({
    lat: z.number(),
    lon: z.number(),
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
      { message: "No active duty session." },
      { status: 404 },
    );
  }

  await prisma.dutySession.update({
    where: { id: session.id },
    data: {
      endedAt: new Date(),
      endedLat: parsed.data.lat ?? null,
      endedLon: parsed.data.lon ?? null,
    },
  });

  if (typeof parsed.data.lat === "number" && typeof parsed.data.lon === "number") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastKnownLat: parsed.data.lat,
        lastKnownLon: parsed.data.lon,
        lastPingAt: new Date(),
      },
    });
  }

  return NextResponse.json({ active: false });
}
