import { UserRole } from "@prisma/client";
import Link from "next/link";
import { DutyToggle } from "@/components/duty-toggle";
import { FieldRouteMap } from "@/components/field-route-map";
import { prisma } from "@/lib/prisma";
import { startOfUtcDay } from "@/lib/schedule";
import { requireUser } from "@/lib/session";
import {
  canonicalTaskStatusClasses,
  canonicalTaskStatusLabel,
  toCanonicalTaskStatus,
} from "@/lib/task-status";

export async function TasksTodayPageContent() {
  const user = await requireUser(UserRole.FIELD_FORCE);
  const today = startOfUtcDay(new Date());

  const [assignmentRows, taskRows, activeSession] = await Promise.all([
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
    prisma.task.findMany({
      where: {
        userId: user.id,
        scheduledDate: today,
      },
      include: {
        outlet: true,
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

  const todayTaskByOutletId = new Map(taskRows.map((task) => [task.outletId, task]));
  const routeAssignments = [...assignmentRows].sort((left, right) => {
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
  }).map((assignment, index) => {
    const todayTask = todayTaskByOutletId.get(assignment.outletId) ?? null;

    return {
      order: index + 1,
      outlet: assignment.outlet,
      todayTask,
      canonicalStatus: todayTask ? toCanonicalTaskStatus(todayTask.status) : null,
    };
  });

  const routeStops = routeAssignments.map((assignment) => ({
    order: assignment.order,
    kodeToko: assignment.outlet.storeCode,
    namaToko: assignment.outlet.name,
    alamat: assignment.outlet.address,
    lat: assignment.outlet.latitude,
    lon: assignment.outlet.longitude,
  }));
  const readyTaskCount = routeAssignments.filter((assignment) => assignment.todayTask).length;

  return (
    <main className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-6">
        <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Assigned Route
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                {routeAssignments.length} outlet assigned by supervisor
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Halaman ini fokus ke rute outlet yang sudah di-assign. Ikuti urutan kunjungan,
                lihat peta, dan buka task detail kalau task hari ini sudah tergenerate.
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
                {routeAssignments.length}
              </p>
            </div>
            <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-500">
                Task Ready Today
              </p>
              <p className="mt-1 text-lg font-semibold text-cyan-900">{readyTaskCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Need Generate
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {Math.max(routeAssignments.length - readyTaskCount, 0)}
              </p>
            </div>
          </div>

          {routeAssignments.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              Belum ada outlet aktif yang di-assign ke user ini.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <FieldRouteMap stops={routeStops} />
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                {readyTaskCount > 0 ? (
                  <p>
                    {readyTaskCount} outlet sudah punya task hari ini. Outlet lain tetap tampil
                    sebagai rute, tapi action check-in/out baru aktif setelah task digenerate.
                  </p>
                ) : (
                  <p>
                    Rute outlet sudah siap dilihat. Kalau tombol check-in/out belum ada, minta
                    supervisor klik <span className="font-semibold">Generate Hari Ini</span>.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Route Detail
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Outlet information
            </h2>
          </div>

          <div className="space-y-4">
            {routeAssignments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                Belum ada detail route untuk ditampilkan.
              </p>
            ) : (
              routeAssignments.map((assignment) => (
                <article
                  className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-900/5"
                  key={assignment.outlet.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                        Stop {assignment.order}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">
                        {assignment.outlet.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {assignment.outlet.storeCode} • {assignment.outlet.address}
                      </p>
                    </div>
                    {assignment.todayTask ? (
                      <Link
                        className="inline-flex rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300"
                        href={`/tasks/${assignment.todayTask.id}`}
                      >
                        Open Task
                      </Link>
                    ) : (
                      <span className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Route Only
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Store
                      </p>
                      <p className="mt-1 text-slate-700">{assignment.outlet.storeCode}</p>
                      <p className="mt-1 text-slate-600">
                        {assignment.outlet.territory ?? "-"} •{" "}
                        {assignment.outlet.territoryGroup ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Supervisor
                      </p>
                      <p className="mt-1 text-slate-700">
                        {assignment.outlet.supervisor?.name ?? "-"}
                      </p>
                      <p className="mt-1 text-slate-600">
                        Telp: {assignment.outlet.supervisorPhone ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Outlet Detail
                      </p>
                      <p className="mt-1 text-slate-700">
                        Type: {assignment.outlet.typeOutlet ?? "-"}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {assignment.outlet.visualPposm ?? "-"} • {assignment.outlet.brand ?? "-"} •{" "}
                        {assignment.outlet.size ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Today Status
                      </p>
                      {assignment.canonicalStatus ? (
                        <span
                          className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${canonicalTaskStatusClasses(assignment.canonicalStatus)}`}
                        >
                          {canonicalTaskStatusLabel(assignment.canonicalStatus)}
                        </span>
                      ) : (
                        <p className="mt-1 text-slate-600">
                          Task belum tergenerate untuk hari ini.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
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
              Belum ada ping lokasi. Start Duty untuk mengirim lokasi.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-white/60 bg-gradient-to-br from-cyan-500 to-blue-600 p-5 text-white shadow-lg shadow-cyan-900/20 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Route Guidance
          </p>
          <p className="mt-3 text-sm leading-6 text-cyan-50">
            Marker biru menunjukkan posisi kamu, marker hijau menunjukkan outlet route. Urutan
            route di peta mengikuti daftar outlet yang sudah di-assign supervisor.
          </p>
        </section>
      </aside>
    </main>
  );
}
