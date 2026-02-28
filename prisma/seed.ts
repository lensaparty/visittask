import bcrypt from "bcryptjs";
import { addDays, getISOWeek } from "date-fns";
import {
  PrismaClient,
  ScheduleDay,
  TaskStatus,
  UserRole,
  WeekParity,
} from "@prisma/client";

const prisma = new PrismaClient();

function getWeekParity(date: Date): WeekParity {
  return getISOWeek(date) % 2 === 0 ? WeekParity.EVEN : WeekParity.ODD;
}

function getScheduleDay(date: Date): ScheduleDay {
  const dayMap: Record<number, ScheduleDay> = {
    0: ScheduleDay.MINGGU,
    1: ScheduleDay.SENIN,
    2: ScheduleDay.SELASA,
    3: ScheduleDay.RABU,
    4: ScheduleDay.KAMIS,
    5: ScheduleDay.JUMAT,
    6: ScheduleDay.SABTU,
  };

  return dayMap[date.getDay()];
}

async function main() {
  const password = process.env.DEFAULT_IMPORTED_USER_PASSWORD ?? "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor.demo@example.com" },
    update: {},
    create: {
      email: "supervisor.demo@example.com",
      name: "Supervisor Demo",
      passwordHash,
      role: UserRole.SUPERVISOR,
      phone: "081234567890",
      territory: "Sukabumi",
      territoryGroup: "West Java South",
    },
  });

  const fieldForceA = await prisma.user.upsert({
    where: { email: "aris.ff@example.com" },
    update: {},
    create: {
      email: "aris.ff@example.com",
      name: "Aris Putra",
      passwordHash,
      role: UserRole.FIELD_FORCE,
      territory: "Sukabumi",
      territoryGroup: "West Java South",
    },
  });

  const fieldForceB = await prisma.user.upsert({
    where: { email: "dina.ff@example.com" },
    update: {},
    create: {
      email: "dina.ff@example.com",
      name: "Dina Ayu",
      passwordHash,
      role: UserRole.FIELD_FORCE,
      territory: "Sukabumi",
      territoryGroup: "West Java South",
    },
  });

  const outlets = await Promise.all([
    prisma.outlet.upsert({
      where: { storeCode: "TOKO-001" },
      update: {},
      create: {
        storeCode: "TOKO-001",
        name: "Toko Bahari",
        address: "Jl. Siliwangi No. 10",
        subdistrict: "Cikole",
        regency: "Sukabumi",
        latitude: -6.918301,
        longitude: 106.927995,
        district: "Sukabumi Kota",
        territory: "Sukabumi",
        territoryGroup: "West Java South",
        oddScheduleDay: ScheduleDay.SENIN,
        evenScheduleDay: ScheduleDay.RABU,
        supervisorId: supervisor.id,
        fieldForceId: fieldForceA.id,
        supervisorPhone: supervisor.phone,
        typeOutlet: "General Trade",
        visualPposm: "Banner",
        brand: "Brand A",
        size: "Medium",
        sunscreenCount: 12,
      },
    }),
    prisma.outlet.upsert({
      where: { storeCode: "TOKO-002" },
      update: {},
      create: {
        storeCode: "TOKO-002",
        name: "Toko Melati",
        address: "Jl. Otista No. 25",
        subdistrict: "Warudoyong",
        regency: "Sukabumi",
        latitude: -6.922553,
        longitude: 106.93128,
        district: "Sukabumi Kota",
        territory: "Sukabumi",
        territoryGroup: "West Java South",
        oddScheduleDay: ScheduleDay.SELASA,
        evenScheduleDay: ScheduleDay.KAMIS,
        supervisorId: supervisor.id,
        fieldForceId: fieldForceB.id,
        supervisorPhone: supervisor.phone,
        typeOutlet: "General Trade",
        visualPposm: "Shelf Strip",
        brand: "Brand B",
        size: "Large",
        sunscreenCount: 8,
      },
    }),
  ]);

  const today = new Date();

  await Promise.all(
    Array.from({ length: 3 }).flatMap((_, index) => {
      const date = addDays(today, index);
      const parity = getWeekParity(date);
      const day = getScheduleDay(date);

      return outlets
        .filter((outlet) =>
          parity === WeekParity.ODD
            ? outlet.oddScheduleDay === day
            : outlet.evenScheduleDay === day,
        )
        .map((outlet) =>
          prisma.task.upsert({
            where: {
              outletId_userId_scheduledDate: {
                outletId: outlet.id,
                userId: outlet.fieldForceId!,
                scheduledDate: new Date(
                  Date.UTC(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    0,
                    0,
                    0,
                  ),
                ),
              },
            },
            update: {},
            create: {
              outletId: outlet.id,
              userId: outlet.fieldForceId!,
              scheduledDate: new Date(
                Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
              ),
              weekParity: parity,
              scheduleDay: day,
              status: TaskStatus.PENDING,
            },
          }),
        );
    }),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
