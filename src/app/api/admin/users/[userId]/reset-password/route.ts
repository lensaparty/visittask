import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultImportedUserPassword } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const resetPasswordSchema = z.object({
  password: z.string().trim().min(8).optional().or(z.literal("")),
});

export async function POST(
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

  const body = await request.json().catch(() => ({}));
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const { userId } = await context.params;
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
    },
  });

  if (!existingUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const nextPassword =
    parsed.data.password?.trim() || getDefaultImportedUserPassword();
  const passwordHash = await bcrypt.hash(nextPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
    },
  });

  return NextResponse.json({
    ok: true,
    usedDefaultPassword: nextPassword === getDefaultImportedUserPassword(),
  });
}
