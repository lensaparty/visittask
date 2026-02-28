import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfUtcDay } from "@/lib/schedule";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== UserRole.FIELD_FORCE) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const today = startOfUtcDay(new Date());
  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      scheduledDate: today,
    },
    include: {
      outlet: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json({
    date: today.toISOString().slice(0, 10),
    tasks: tasks.map((task) => ({
      id: task.id,
      status: task.status,
      scheduledDate: task.scheduledDate.toISOString().slice(0, 10),
      visit: {
        checkInAt: task.checkInAt,
        checkInLat: task.checkInLat,
        checkInLon: task.checkInLon,
        checkInDistanceMeters: task.checkInDistanceMeters,
        checkOutAt: task.checkOutAt,
        checkOutLat: task.checkOutLat,
        checkOutLon: task.checkOutLon,
      },
      outlet: {
        id: task.outlet.id,
        kodeToko: task.outlet.storeCode,
        namaToko: task.outlet.name,
        alamat: task.outlet.address,
        kecamatan: task.outlet.subdistrict,
        kabupaten: task.outlet.regency,
        lat: task.outlet.latitude,
        lon: task.outlet.longitude,
        district: task.outlet.district,
        territory: task.outlet.territory,
        territoryGroup: task.outlet.territoryGroup,
        noTelpSpv: task.outlet.supervisorPhone,
        typeOutlet: task.outlet.typeOutlet,
        visualPposm: task.outlet.visualPposm,
        brand: task.outlet.brand,
        ukuran: task.outlet.size,
        jumlahSunscreen: task.outlet.sunscreenCount,
      },
    })),
  });
}
