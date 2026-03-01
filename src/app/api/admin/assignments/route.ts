import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getSupervisorFallbackByDistrict } from "@/lib/supervisor-fallback";

async function requireSupervisor() {
  const adminUser = await getCurrentUser();

  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (adminUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  return null;
}

export async function GET(request: Request) {
  const authError = await requireSupervisor();

  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();

  if (!userId) {
    return NextResponse.json(
      { message: "Query parameter `userId` is required." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      userId,
    },
    include: {
      outlet: {
        select: {
          id: true,
          storeCode: true,
          name: true,
          address: true,
          subdistrict: true,
          regency: true,
          district: true,
          territory: true,
          territoryGroup: true,
          supervisorPhone: true,
          typeOutlet: true,
          visualPposm: true,
          brand: true,
          size: true,
          latitude: true,
          longitude: true,
          supervisor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const sortedAssignments = [...assignments].sort((left, right) => {
    const leftKey = [
      left.outlet.regency ?? "",
      left.outlet.subdistrict ?? "",
      left.outlet.district ?? "",
      left.outlet.address,
      left.outlet.latitude.toFixed(6),
      left.outlet.longitude.toFixed(6),
      left.outlet.storeCode,
    ].join("|");
    const rightKey = [
      right.outlet.regency ?? "",
      right.outlet.subdistrict ?? "",
      right.outlet.district ?? "",
      right.outlet.address,
      right.outlet.latitude.toFixed(6),
      right.outlet.longitude.toFixed(6),
      right.outlet.storeCode,
    ].join("|");

    return leftKey.localeCompare(rightKey);
  });

  return NextResponse.json({
    user,
    assignments: sortedAssignments.map((assignment) => ({
      id: assignment.id,
      active: assignment.active,
      outletId: assignment.outletId,
      kodeToko: assignment.outlet.storeCode,
      namaToko: assignment.outlet.name,
      alamat: assignment.outlet.address,
      kecamatan: assignment.outlet.subdistrict,
      kabupaten: assignment.outlet.regency,
      district: assignment.outlet.district,
      territory: assignment.outlet.territory,
      territoryGroup: assignment.outlet.territoryGroup,
      supervisorName:
        assignment.outlet.supervisor?.name ??
        getSupervisorFallbackByDistrict(assignment.outlet.district),
      noTelpSpv: assignment.outlet.supervisorPhone,
      typeOutlet: assignment.outlet.typeOutlet,
      visualPposm: assignment.outlet.visualPposm,
      brand: assignment.outlet.brand,
      ukuran: assignment.outlet.size,
      lat: assignment.outlet.latitude,
      lon: assignment.outlet.longitude,
    })),
  });
}

export async function DELETE(request: Request) {
  const authError = await requireSupervisor();

  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();
  const assignmentId = searchParams.get("assignmentId")?.trim();
  const inactiveOnly = searchParams.get("inactiveOnly") === "true";

  if (!userId) {
    return NextResponse.json(
      { message: "Query parameter `userId` is required." },
      { status: 400 },
    );
  }

  if (!assignmentId && !inactiveOnly) {
    return NextResponse.json(
      { message: "Provide `assignmentId` or set `inactiveOnly=true`." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  if (assignmentId) {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        userId,
      },
      select: {
        id: true,
        active: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ message: "Assignment not found." }, { status: 404 });
    }

    if (assignment.active) {
      return NextResponse.json(
        { message: "Only inactive assignments can be deleted permanently." },
        { status: 400 },
      );
    }

    await prisma.assignment.delete({
      where: {
        id: assignment.id,
      },
    });

    return NextResponse.json({
      deletedCount: 1,
    });
  }

  const result = await prisma.assignment.deleteMany({
    where: {
      userId,
      active: false,
    },
  });

  return NextResponse.json({
    deletedCount: result.count,
  });
}
