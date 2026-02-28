import { ScheduleDay, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const IMPORT_WEEKDAY_TO_SCHEDULE_DAY: Record<ImportScheduleDayCode, ScheduleDay> = {
  MON: ScheduleDay.SENIN,
  TUE: ScheduleDay.SELASA,
  WED: ScheduleDay.RABU,
  THU: ScheduleDay.KAMIS,
  FRI: ScheduleDay.JUMAT,
  SAT: ScheduleDay.SABTU,
  SUN: ScheduleDay.MINGGU,
};

export type ImportScheduleDayCode =
  | "MON"
  | "TUE"
  | "WED"
  | "THU"
  | "FRI"
  | "SAT"
  | "SUN";

const INDONESIAN_WEEKDAY_TO_IMPORT_CODE: Record<string, ImportScheduleDayCode> = {
  senin: "MON",
  selasa: "TUE",
  rabu: "WED",
  kamis: "THU",
  jumat: "FRI",
  sabtu: "SAT",
  minggu: "SUN",
};

export async function findExistingUserByName(params: {
  name: string | null | undefined;
  role: UserRole;
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

  return existing;
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

export function parseImportedScheduleCode(value: unknown) {
  const normalized = normalizeText(value)?.toLowerCase();

  if (!normalized || normalized === "0") {
    return null;
  }

  return INDONESIAN_WEEKDAY_TO_IMPORT_CODE[normalized] ?? null;
}

export function toPrismaScheduleDay(
  value: ImportScheduleDayCode | null,
): ScheduleDay | null {
  if (!value) {
    return null;
  }

  return IMPORT_WEEKDAY_TO_SCHEDULE_DAY[value];
}
