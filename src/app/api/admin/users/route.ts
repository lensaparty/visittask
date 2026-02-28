import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultImportedUserPassword } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.nativeEnum(UserRole),
  password: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  territory: z.string().trim().optional().or(z.literal("")),
  territoryGroup: z.string().trim().optional().or(z.literal("")),
});

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  const adminUser = await getCurrentUser();

  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (adminUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid user payload." },
      { status: 400 },
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
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

  const rawPassword =
    parsed.data.password?.trim() || getDefaultImportedUserPassword();

  if (rawPassword.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: normalizedEmail,
      role: parsed.data.role,
      passwordHash,
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
    },
  });

  return NextResponse.json({
    user,
    usedDefaultPassword: rawPassword === getDefaultImportedUserPassword(),
  });
}
