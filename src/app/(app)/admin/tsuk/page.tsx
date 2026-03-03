import { UserRole } from "@prisma/client";
import { TsukClusterManager } from "@/components/tsuk-cluster-manager";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSupervisorFallbackByDistrict } from "@/lib/supervisor-fallback";

export default async function AdminTsukPage() {
  await requireUser(UserRole.SUPERVISOR);

  const [users, outletRows] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: UserRole.FIELD_FORCE,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.outlet.findMany({
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
        oddScheduleDay: true,
        evenScheduleDay: true,
        supervisorPhone: true,
        latitude: true,
        longitude: true,
        supervisor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        storeCode: "asc",
      },
    }),
  ]);

  const outlets = outletRows.map((outlet) => ({
    id: outlet.id,
    storeCode: outlet.storeCode,
    name: outlet.name,
    address: outlet.address,
    subdistrict: outlet.subdistrict,
    regency: outlet.regency,
    district: outlet.district,
    territory: outlet.territory,
    territoryGroup: outlet.territoryGroup,
    oddScheduleDay: outlet.oddScheduleDay,
    evenScheduleDay: outlet.evenScheduleDay,
    supervisorName:
      outlet.supervisor?.name ?? getSupervisorFallbackByDistrict(outlet.district),
    supervisorPhone: outlet.supervisorPhone,
    latitude: outlet.latitude,
    longitude: outlet.longitude,
  }));

  return (
    <main className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          TSUK Planner
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Kelompokkan outlet terdekat per 35 titik
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Menu ini dibuat terpisah dari master outlet. Fokusnya mengelompokkan TSUK yang saling
          berdekatan supaya supervisor lebih mudah membagi rute lapangan.
        </p>
      </section>

      <TsukClusterManager outlets={outlets} users={users} />
    </main>
  );
}
