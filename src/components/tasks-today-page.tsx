import { UserRole } from "@prisma/client";
import { DutyToggle } from "@/components/duty-toggle";
import { FieldForceEntryAlert } from "@/components/field-force-entry-alert";
import { FieldRoutePlanner } from "@/components/field-route-planner";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function TasksTodayPageContent() {
  const user = await requireUser(UserRole.FIELD_FORCE);

  const [assignmentRows, activeSession] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        userId: user.id,
        active: true,
      },
      include: {
        outlet: {
          include: {
            supervisor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.dutySession.findFirst({
      where: {
        userId: user.id,
        endedAt: null,
      },
      orderBy: {
        startedAt: "desc",
      },
    }),
  ]);

  const sortedAssignments = [...assignmentRows].sort((left, right) => {
    const leftKey = [
      left.outlet.territory ?? "",
      left.outlet.regency ?? "",
      left.outlet.subdistrict ?? "",
      left.outlet.address,
      left.outlet.storeCode,
    ].join("|");
    const rightKey = [
      right.outlet.territory ?? "",
      right.outlet.regency ?? "",
      right.outlet.subdistrict ?? "",
      right.outlet.address,
      right.outlet.storeCode,
    ].join("|");

    return leftKey.localeCompare(rightKey);
  });

  const plannerAssignments = sortedAssignments.map((assignment) => ({
    id: assignment.outlet.id,
    kodeToko: assignment.outlet.storeCode,
    namaToko: assignment.outlet.name,
    alamat: assignment.outlet.address,
    lat: assignment.outlet.latitude,
    lon: assignment.outlet.longitude,
    territory: assignment.outlet.territory,
    territoryGroup: assignment.outlet.territoryGroup,
    supervisorName: assignment.outlet.supervisor?.name ?? null,
    noTelpSpv: assignment.outlet.supervisorPhone ?? null,
    typeOutlet: assignment.outlet.typeOutlet ?? null,
    visualPposm: assignment.outlet.visualPposm ?? null,
    brand: assignment.outlet.brand ?? null,
    ukuran: assignment.outlet.size ?? null,
    jumlahSunscreen: assignment.outlet.sunscreenCount ?? null,
  }));

  return (
    <>
      <FieldForceEntryAlert />
      <main className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                  Assigned Route
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {plannerAssignments.length} outlet assigned by supervisor
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Halaman ini fokus ke route outlet yang di-assign supervisor. Saat GPS aktif,
                  urutan route akan menyesuaikan outlet terdekat dari posisi kamu.
                </p>
              </div>
              <DutyToggle initialActiveSessionId={activeSession?.id ?? null} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Route Assigned
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {plannerAssignments.length}
                </p>
              </div>
              <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-500">
                  Route Mode
                </p>
                <p className="mt-1 text-lg font-semibold text-cyan-900">Nearest</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Navigation
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Google Maps + Waze
                </p>
              </div>
            </div>

            {plannerAssignments.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Belum ada outlet aktif yang di-assign ke user ini.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                Supervisor cukup assign outlet, lalu field force akan melihat urutan route dan
                navigasi ke outlet terdekat tanpa alur check-in atau check-out.
              </div>
            )}
          </section>

          {plannerAssignments.length > 0 ? (
            <FieldRoutePlanner assignments={plannerAssignments} />
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Last Ping
            </p>
            {user.lastPingAt ? (
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(user.lastPingAt)}
                </p>
                <p>
                  {user.lastKnownLat?.toFixed(6)}, {user.lastKnownLon?.toFixed(6)}
                </p>
                <p>
                  Accuracy:{" "}
                  {user.lastKnownAccuracy != null
                    ? `${Math.round(user.lastKnownAccuracy)} m`
                    : "-"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Belum ada ping lokasi. Start Duty untuk membantu supervisor memantau posisi terakhir.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-white/60 bg-gradient-to-br from-cyan-500 to-blue-600 p-5 text-white shadow-lg shadow-cyan-900/20 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
              Route Guidance
            </p>
            <p className="mt-3 text-sm leading-6 text-cyan-50">
              Marker biru menunjukkan posisi kamu, marker hijau menunjukkan outlet route. Saat GPS
              aktif, urutan route menyesuaikan outlet terdekat dari posisi kamu.
            </p>
          </section>
        </aside>
      </main>
    </>
  );
}
