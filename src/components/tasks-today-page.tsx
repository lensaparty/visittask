import { TaskStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import { DutyToggle } from "@/components/duty-toggle";
import { prisma } from "@/lib/prisma";
import { scheduleDayLabel, startOfUtcDay } from "@/lib/schedule";
import { requireUser } from "@/lib/session";

const statusStyles: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: "bg-amber-100 text-amber-800",
  [TaskStatus.CHECKED_IN]: "bg-sky-100 text-sky-800",
  [TaskStatus.COMPLETED]: "bg-emerald-100 text-emerald-800",
  [TaskStatus.MISSED]: "bg-rose-100 text-rose-800",
};

export async function TasksTodayPageContent() {
  const user = await requireUser(UserRole.FIELD_FORCE);
  const today = startOfUtcDay(new Date());

  const [taskRows, activeSession] = await Promise.all([
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

  const tasks = [...taskRows].sort((left, right) =>
    left.outlet.name.localeCompare(right.outlet.name),
  );

  return (
    <main className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Tasks Today
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {tasks.length} scheduled outlet visit{tasks.length === 1 ? "" : "s"}
            </h2>
          </div>
          <DutyToggle initialActiveSessionId={activeSession?.id ?? null} />
        </div>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No tasks generated for today yet.
            </div>
          ) : (
            tasks.map((task) => (
              <Link
                className="block rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-cyan-300 hover:bg-cyan-50/60"
                href={`/tasks/${task.id}`}
                key={task.id}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-slate-900">
                      {task.outlet.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {task.outlet.storeCode} • {task.outlet.address}
                    </p>
                    <p className="text-sm text-slate-500">
                      {task.outlet.territory ?? "-"} •{" "}
                      {scheduleDayLabel(task.scheduleDay)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status]}`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
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
              No duty tracking ping recorded yet.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-white/60 bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-white shadow-lg shadow-cyan-900/20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Check-in Rule
          </p>
          <p className="mt-3 text-sm leading-6 text-cyan-50">
            Check-in only succeeds when you are within 100 meters of the outlet
            coordinates. Open a task card to see the map and action buttons.
          </p>
        </section>
      </aside>
    </main>
  );
}
