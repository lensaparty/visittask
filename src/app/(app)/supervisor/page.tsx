import { TaskStatus, UserRole } from "@prisma/client";
import { SupervisorTools } from "@/components/supervisor-tools";
import { prisma } from "@/lib/prisma";
import { startOfUtcDay } from "@/lib/schedule";
import { requireUser } from "@/lib/session";

const summaryLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: "Pending",
  [TaskStatus.IN_PROGRESS]: "In Progress",
  [TaskStatus.DONE]: "Done",
  [TaskStatus.CHECKED_IN]: "Checked In",
  [TaskStatus.COMPLETED]: "Completed",
  [TaskStatus.MISSED]: "Missed",
};

export default async function SupervisorPage() {
  await requireUser(UserRole.SUPERVISOR);
  const today = startOfUtcDay(new Date());

  const [fieldForceUsers, taskSummary, recentTasks] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: UserRole.FIELD_FORCE,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: {
        scheduledDate: today,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.task.findMany({
      where: {
        scheduledDate: today,
      },
      include: {
        user: true,
        outlet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
  ]);

  return (
    <main className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <section className="space-y-6">
        <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Live Field Force
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Last location ping per user
            </h2>
          </div>

          <div className="space-y-4">
            {fieldForceUsers.map((fieldForce) => (
              <div
                className="rounded-2xl border border-slate-200 px-4 py-4"
                key={fieldForce.id}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{fieldForce.name}</p>
                    <p className="text-sm text-slate-500">{fieldForce.email}</p>
                  </div>
                  <div className="text-sm text-slate-600">
                    {fieldForce.lastPingAt ? (
                      <div className="space-y-1 text-right">
                        <p>
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(fieldForce.lastPingAt)}
                        </p>
                        <p>
                          {fieldForce.lastKnownLat?.toFixed(6)},{" "}
                          {fieldForce.lastKnownLon?.toFixed(6)}
                        </p>
                      </div>
                    ) : (
                      "No ping yet"
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Today Summary
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Task status counts
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {Object.values(TaskStatus).map((status) => {
              const count =
                taskSummary.find((item) => item.status === status)?._count._all ?? 0;

              return (
                <div
                  className="rounded-2xl border border-slate-200 px-4 py-5"
                  key={status}
                >
                  <p className="text-sm text-slate-500">{summaryLabels[status]}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {count}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <aside className="space-y-6">
        <SupervisorTools />

        <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Recent Tasks
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Generated today
            </h2>
          </div>
          <div className="space-y-4">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No tasks generated for today.
              </p>
            ) : (
              recentTasks.map((task) => (
                <div
                  className="rounded-2xl border border-slate-200 px-4 py-4"
                  key={task.id}
                >
                  <p className="font-semibold text-slate-900">{task.outlet.name}</p>
                  <p className="text-sm text-slate-600">{task.user.name}</p>
                  <p className="text-sm text-slate-500">{task.status}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}
