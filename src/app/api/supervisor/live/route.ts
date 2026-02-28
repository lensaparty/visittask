import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfUtcDay } from "@/lib/schedule";
import { getCurrentUser } from "@/lib/session";
import { toCanonicalTaskStatus } from "@/lib/task-status";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const today = startOfUtcDay(new Date());
  const fieldForceUsers = await prisma.user.findMany({
    where: {
      role: UserRole.FIELD_FORCE,
    },
    select: {
      id: true,
      name: true,
      email: true,
      lastKnownLat: true,
      lastKnownLon: true,
      lastKnownAccuracy: true,
      lastPingAt: true,
      locationPings: {
        orderBy: {
          pingedAt: "desc",
        },
        take: 1,
        select: {
          pingedAt: true,
          latitude: true,
          longitude: true,
          accuracy: true,
          speed: true,
        },
      },
      tasks: {
        where: {
          scheduledDate: today,
        },
        select: {
          status: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json({
    users: fieldForceUsers.map((fieldForceUser) => {
      const latestPing = fieldForceUser.locationPings[0] ?? null;
      const doneCount = fieldForceUser.tasks.filter(
        (task) => toCanonicalTaskStatus(task.status) === "DONE",
      ).length;
      const pendingCount = fieldForceUser.tasks.filter(
        (task) => toCanonicalTaskStatus(task.status) !== "DONE",
      ).length;

      return {
        id: fieldForceUser.id,
        name: fieldForceUser.name,
        email: fieldForceUser.email,
        latestPing: latestPing
          ? {
              timestamp: latestPing.pingedAt,
              lat: latestPing.latitude,
              lon: latestPing.longitude,
              accuracy: latestPing.accuracy,
              speed: latestPing.speed,
            }
          : fieldForceUser.lastPingAt
            ? {
                timestamp: fieldForceUser.lastPingAt,
                lat: fieldForceUser.lastKnownLat,
                lon: fieldForceUser.lastKnownLon,
                accuracy: fieldForceUser.lastKnownAccuracy,
                speed: null,
              }
            : null,
        taskCounts: {
          done: doneCount,
          pending: pendingCount,
        },
      };
    }),
  });
}
