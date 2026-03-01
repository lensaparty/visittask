import { UserRole } from "@prisma/client";
import { OutletCatalogManager } from "@/components/outlet-catalog-manager";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSupervisorFallbackByDistrict } from "@/lib/supervisor-fallback";

export default async function AdminOutletsPage() {
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
    }),
  ]);

  const outlets = [...outletRows]
    .sort((left, right) => {
      const leftKey = [
        left.regency ?? "",
        left.subdistrict ?? "",
        left.district ?? "",
        left.address,
        left.latitude.toFixed(6),
        left.longitude.toFixed(6),
        left.storeCode,
      ].join("|");
      const rightKey = [
        right.regency ?? "",
        right.subdistrict ?? "",
        right.district ?? "",
        right.address,
        right.latitude.toFixed(6),
        right.longitude.toFixed(6),
        right.storeCode,
      ].join("|");

      return leftKey.localeCompare(rightKey);
    })
    .map((outlet) => ({
      id: outlet.id,
      storeCode: outlet.storeCode,
      name: outlet.name,
      address: outlet.address,
      subdistrict: outlet.subdistrict,
      regency: outlet.regency,
      district: outlet.district,
      territory: outlet.territory,
      territoryGroup: outlet.territoryGroup,
      supervisorName:
        outlet.supervisor?.name ?? getSupervisorFallbackByDistrict(outlet.district),
      supervisorPhone: outlet.supervisorPhone,
      typeOutlet: outlet.typeOutlet,
      visualPposm: outlet.visualPposm,
      brand: outlet.brand,
      size: outlet.size,
      latitude: outlet.latitude,
      longitude: outlet.longitude,
    }));

  return (
    <main className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Master Outlet
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Lihat seluruh outlet sebelum assign
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Katalog master outlet dipisah dari menu assignment agar data lebih lega dibaca. Gunakan
          filter group, wilayah, dan territory untuk meninjau outlet sebelum copy kode toko ke menu
          assign.
        </p>
      </section>
      <OutletCatalogManager outlets={outlets} users={users} />
    </main>
  );
}
