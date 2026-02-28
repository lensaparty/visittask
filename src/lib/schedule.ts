import { Outlet, ScheduleDay, WeekParity } from "@prisma/client";
import { getISOWeek } from "date-fns";

export type WeekType = "ODD" | "EVEN";
export type WeekdayId = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const SCHEDULE_DAY_LABELS: Record<ScheduleDay, string> = {
  [ScheduleDay.SENIN]: "Senin",
  [ScheduleDay.SELASA]: "Selasa",
  [ScheduleDay.RABU]: "Rabu",
  [ScheduleDay.KAMIS]: "Kamis",
  [ScheduleDay.JUMAT]: "Jumat",
  [ScheduleDay.SABTU]: "Sabtu",
  [ScheduleDay.MINGGU]: "Minggu",
};

const DAY_NAME_LOOKUP: Record<string, ScheduleDay> = {
  senin: ScheduleDay.SENIN,
  selasa: ScheduleDay.SELASA,
  rabu: ScheduleDay.RABU,
  kamis: ScheduleDay.KAMIS,
  jumat: ScheduleDay.JUMAT,
  sabtu: ScheduleDay.SABTU,
  minggu: ScheduleDay.MINGGU,
};

const WEEKDAY_ID_LOOKUP: Record<number, WeekdayId> = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};

const WEEKDAY_ID_TO_SCHEDULE_DAY: Record<WeekdayId, ScheduleDay> = {
  MON: ScheduleDay.SENIN,
  TUE: ScheduleDay.SELASA,
  WED: ScheduleDay.RABU,
  THU: ScheduleDay.KAMIS,
  FRI: ScheduleDay.JUMAT,
  SAT: ScheduleDay.SABTU,
  SUN: ScheduleDay.MINGGU,
};

export function getIsoWeekNumber(date: Date): number {
  return getISOWeek(date);
}

export function getWeekType(date: Date): WeekType {
  return getIsoWeekNumber(date) % 2 === 0 ? "EVEN" : "ODD";
}

export function getWeekdayId(date: Date): WeekdayId {
  return WEEKDAY_ID_LOOKUP[date.getDay()];
}

export function weekdayIdToScheduleDay(weekdayId: WeekdayId): ScheduleDay {
  return WEEKDAY_ID_TO_SCHEDULE_DAY[weekdayId];
}

export function getWeekParity(date: Date): WeekParity {
  return getWeekType(date) === "EVEN" ? WeekParity.EVEN : WeekParity.ODD;
}

export function getScheduleDayFromDate(date: Date): ScheduleDay {
  return weekdayIdToScheduleDay(getWeekdayId(date));
}

export function scheduleDayLabel(day: ScheduleDay | null | undefined) {
  if (!day) {
    return "-";
  }

  return SCHEDULE_DAY_LABELS[day];
}

export function parseScheduleDay(value: unknown): ScheduleDay | null {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (!normalized || normalized === "0") {
    return null;
  }

  return DAY_NAME_LOOKUP[normalized] ?? null;
}

export function shouldGenerateTaskForDate(
  outlet: Pick<Outlet, "oddScheduleDay" | "evenScheduleDay">,
  date: Date,
) {
  const parity = getWeekParity(date);
  const day = getScheduleDayFromDate(date);
  const expectedDay =
    parity === WeekParity.ODD ? outlet.oddScheduleDay : outlet.evenScheduleDay;

  return expectedDay === day
    ? {
        parity,
        day,
      }
    : null;
}

export function enumerateDates(start: Date, end: Date) {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
  );
}

export function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}
