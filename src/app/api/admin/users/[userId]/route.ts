import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const updateUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.nativeEnum(UserRole),
  phone: z.string().trim().optional().or(z.literal("")),
  territory: z.string().trim().optional().or(z.literal("")),
  territoryGroup: z.string().trim().optional().or(z.literal("")),
});

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUser = await getCurrentUser();

  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (adminUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid user payload." },
      { status: 400 },
    );
  }

  const { userId } = await context.params;
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
    },
  });

  if (!existingUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  if (normalizedEmail !== existingUser.email) {
    const duplicateEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (duplicateEmail) {
      return NextResponse.json(
        { message: "Email is already in use." },
        { status: 409 },
      );
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      email: normalizedEmail,
      role: parsed.data.role,
      phone: normalizeOptional(parsed.data.phone),
      territory: normalizeOptional(parsed.data.territory),
      territoryGroup: normalizeOptional(parsed.data.territoryGroup),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      territory: true,
      territoryGroup: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    user: updatedUser,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const adminUser = await getCurrentUser();

  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (adminUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { userId } = await context.params;

  if (userId === adminUser.id) {
    return NextResponse.json(
      { message: "You cannot delete the account you are currently using." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!existingUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  if (existingUser.role === UserRole.SUPERVISOR) {
    const supervisorCount = await prisma.user.count({
      where: {
        role: UserRole.SUPERVISOR,
      },
    });

    if (supervisorCount <= 1) {
      return NextResponse.json(
        { message: "At least one supervisor account must remain." },
        { status: 400 },
      );
    }
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ ok: true });
}
