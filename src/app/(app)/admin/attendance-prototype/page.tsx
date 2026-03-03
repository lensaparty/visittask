import { UserRole } from "@prisma/client";
import { requireUser } from "@/lib/session";

const adminModuleItems = [
  {
    title: "Dashboard Supervisor",
    path: "/attendance/field-force/supervisor",
    description: "Monitor ping terakhir, task generator, dan tangguhan asset.",
  },
  {
    title: "Import & Master Outlet",
    path: "/attendance/field-force/outlets",
    description: "Upload workbook, reset outlet, lalu review master outlet.",
  },
  {
    title: "TSUK Planner",
    path: "/attendance/field-force/tsuk",
    description: "Cluster outlet per 35 titik dan assign grup ke field force.",
  },
  {
    title: "Assignment",
    path: "/attendance/field-force/assign",
    description: "Kelola assignment aktif, restore inactive, dan tangguhan asset.",
  },
];

const fieldForceModuleItems = [
  {
    title: "Route Today",
    path: "/attendance/field-force/route/today",
    description: "Lihat rute hari ini, asset summary, dan tangguhkan outlet saat asset habis.",
  },
  {
    title: "Task Detail (opsional)",
    path: "/attendance/field-force/tasks/[id]",
    description: "Masih bisa dipakai kalau nanti visit detail mau diaktifkan lagi.",
  },
];

const sharedData = [
  "Auth / session tetap pakai sistem absensi utama.",
  "User / pegawai aktif diambil dari master employee aplikasi absensi.",
  "Role mapping: supervisor -> SUPERVISOR, lapangan -> FIELD_FORCE.",
  "Tabel field-force tetap terpisah: Outlet, Assignment, Task, LocationPing, DutySession.",
];

export default async function AttendancePrototypePage() {
  await requireUser(UserRole.SUPERVISOR);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5 shadow-lg shadow-cyan-900/5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Prototype Integrasi
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Menu field-force sebagai submodule aplikasi absensi
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
          Prototype ini menunjukkan bentuk paling aman saat modul field-force digabung ke aplikasi
          absensi: auth dan master pegawai tetap ikut sistem utama, sementara domain outlet dan
          routing tetap hidup sebagai module terpisah di bawah menu attendance.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Sidebar Admin
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Group menu di bawah Attendance
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Di app absensi utama, supervisor cukup melihat satu grup baru bernama{" "}
              <span className="font-semibold">Field Force</span> di bawah domain attendance.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Attendance
            </p>
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Dashboard</div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Absensi Harian</div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Approval</div>
              <div className="rounded-2xl border border-cyan-400 bg-cyan-500/15 px-4 py-3 text-sm">
                Field Force
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {adminModuleItems.map((item) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
                      key={item.path}
                    >
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-cyan-200">
                        {item.path}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Field Force View
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Menu user lapangan
            </h2>
            <div className="mt-4 space-y-3">
              {fieldForceModuleItems.map((item) => (
                <div className="rounded-2xl border border-slate-200 px-4 py-4" key={item.path}>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                    {item.path}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Shared Data
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Yang dipakai bersama
            </h2>
            <div className="mt-4 space-y-3">
              {sharedData.map((item) => (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
