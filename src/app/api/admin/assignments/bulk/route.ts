import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const bulkAssignmentSchema = z.object({
  userEmail: z.string().email(),
  outletCodes: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  const adminUser = await getCurrentUser();

  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (adminUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkAssignmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Provide `userEmail` and a non-empty `outletCodes` array." },
      { status: 400 },
    );
  }

  const userEmail = parsed.data.userEmail.trim().toLowerCase();
  const normalizedCodes = Array.from(
    new Set(
      parsed.data.outletCodes
        .map((code) => code.trim())
        .filter((code) => code.length > 0),
    ),
  );

  if (normalizedCodes.length === 0) {
    return NextResponse.json(
      { message: "At least one outlet code is required." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  if (user.role !== UserRole.FIELD_FORCE) {
    return NextResponse.json(
      { message: "Assignments can only be created for field-force users." },
      { status: 400 },
    );
  }

  const outlets = await prisma.outlet.findMany({
    where: {
      storeCode: {
        in: normalizedCodes,
      },
    },
    select: {
      id: true,
      storeCode: true,
      name: true,
    },
  });

  const outletByCode = new Map(outlets.map((outlet) => [outlet.storeCode, outlet]));
  const matchedOutlets = normalizedCodes
    .map((code) => outletByCode.get(code))
    .filter((outlet): outlet is NonNullable<typeof outlet> => Boolean(outlet));
  const missingOutletCodes = normalizedCodes.filter((code) => !outletByCode.has(code));

  if (matchedOutlets.length > 0) {
    await prisma.$transaction(
      matchedOutlets.map((outlet) =>
        prisma.assignment.upsert({
          where: {
            userId_outletId: {
              userId: user.id,
              outletId: outlet.id,
            },
          },
          update: {
            active: true,
          },
          create: {
            userId: user.id,
            outletId: outlet.id,
            active: true,
          },
        }),
      ),
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    requestedCount: normalizedCodes.length,
    assignedCount: matchedOutlets.length,
    missingOutletCodes,
  });
}
