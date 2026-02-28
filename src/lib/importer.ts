import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { getDefaultImportedUserPassword } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { parseScheduleDay } from "@/lib/schedule";

let cachedImportPasswordHash: string | null = null;

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

async function getImportPasswordHash() {
  if (!cachedImportPasswordHash) {
    cachedImportPasswordHash = await bcrypt.hash(getDefaultImportedUserPassword(), 10);
  }

  return cachedImportPasswordHash;
}

async function generateUniqueEmail(name: string, role: UserRole) {
  const baseSlug = slugify(name) || "user";
  const domain = role === UserRole.SUPERVISOR ? "supervisor.local" : "fieldforce.local";

  for (let suffix = 0; suffix < 500; suffix += 1) {
    const localPart = suffix === 0 ? baseSlug : `${baseSlug}.${suffix + 1}`;
    const email = `${localPart}@${domain}`;
    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      return email;
    }
  }

  throw new Error(`Unable to generate email for ${name}.`);
}

export async function ensureImportedUser(params: {
  name: string | null | undefined;
  role: UserRole;
  phone?: string | null;
  territory?: string | null;
  territoryGroup?: string | null;
}) {
  const normalizedName = params.name?.trim();

  if (!normalizedName) {
    return null;
  }

  const existing = await prisma.user.findFirst({
    where: {
      role: params.role,
      name: {
        equals: normalizedName,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        phone: params.phone ?? existing.phone,
        territory: params.territory ?? existing.territory,
        territoryGroup: params.territoryGroup ?? existing.territoryGroup,
      },
    });
  }

  const email = await generateUniqueEmail(normalizedName, params.role);

  return prisma.user.create({
    data: {
      name: normalizedName,
      email,
      role: params.role,
      passwordHash: await getImportPasswordHash(),
      phone: params.phone ?? null,
      territory: params.territory ?? null,
      territoryGroup: params.territoryGroup ?? null,
    },
  });
}

export function parseCoordinatePair(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const parts = normalized.split(",").map((part) => part.trim());

  if (parts.length !== 2) {
    return null;
  }

  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

export function coerceInteger(value: unknown) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function parseImportedSchedule(value: unknown) {
  return parseScheduleDay(value);
}
