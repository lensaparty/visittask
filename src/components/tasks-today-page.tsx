import { UserRole } from "@prisma/client";
import Link from "next/link";
import { DutyToggle } from "@/components/duty-toggle";
import { prisma } from "@/lib/prisma";
import { scheduleDayLabel, startOfUtcDay } from "@/lib/schedule";
import { requireUser } from "@/lib/session";
import {
  type CanonicalTaskStatus,
  canonicalTaskStatusClasses,
  canonicalTaskStatusLabel,
  toCanonicalTaskStatus,
} from "@/lib/task-status";

type TaskFilter = CanonicalTaskStatus | "ALL";
type TaskSort = "name" | "territory" | "status";

function isTaskFilter(value: string): value is TaskFilter {
  return value === "ALL" || value === "PENDING" || value === "IN_PROGRESS" || value === "DONE" || value === "MISSED";
}

function isTaskSort(value: string): value is TaskSort {
  return value === "name" || value === "territory" || value === "status";
}

function buildTasksTodayHref(filter: TaskFilter, sort: TaskSort) {
  const searchParams = new URLSearchParams();

  if (filter !== "ALL") {
    searchParams.set("status", filter);
  }

  if (sort !== "name") {
    searchParams.set("sort", sort);
  }

  const query = searchParams.toString();

  return query ? `/tasks/today?${query}` : "/tasks/today";
}

export async function TasksTodayPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(UserRole.FIELD_FORCE);
  const today = startOfUtcDay(new Date());
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedFilter = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status;
  const requestedSort = Array.isArray(resolvedSearchParams.sort)
    ? resolvedSearchParams.sort[0]
    : resolvedSearchParams.sort;
  const activeFilter: TaskFilter =
    requestedFilter && isTaskFilter(requestedFilter) ? requestedFilter : "ALL";
  const activeSort: TaskSort =
    requestedSort && isTaskSort(requestedSort) ? requestedSort : "name";

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

  const allTasks = [...taskRows];
  const taskSummary = {
    ALL: allTasks.length,
    PENDING: allTasks.filter((task) => toCanonicalTaskStatus(task.status) === "PENDING").length,
    IN_PROGRESS: allTasks.filter((task) => toCanonicalTaskStatus(task.status) === "IN_PROGRESS").length,
    DONE: allTasks.filter((task) => toCanonicalTaskStatus(task.status) === "DONE").length,
    MISSED: allTasks.filter((task) => toCanonicalTaskStatus(task.status) === "MISSED").length,
  } as const;

  const filteredTasks =
    activeFilter === "ALL"
      ? allTasks
      : allTasks.filter((task) => toCanonicalTaskStatus(task.status) === activeFilter);

  const tasks = [...filteredTasks].sort((left, right) => {
    if (activeSort === "territory") {
      const leftKey = [
        left.outlet.territory ?? "",
        left.outlet.name,
        left.outlet.address,
      ].join("|");
      const rightKey = [
        right.outlet.territory ?? "",
        right.outlet.name,
        right.outlet.address,
      ].join("|");

      return leftKey.localeCompare(rightKey);
    }

    if (activeSort === "status") {
      const leftKey = [
        toCanonicalTaskStatus(left.status),
        left.outlet.name,
        left.outlet.address,
      ].join("|");
      const rightKey = [
        toCanonicalTaskStatus(right.status),
        right.outlet.name,
        right.outlet.address,
      ].join("|");

      return leftKey.localeCompare(rightKey);
    }

    return left.outlet.name.localeCompare(right.outlet.name);
  });

  return (
    <main className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Tasks Today
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {taskSummary.ALL} scheduled outlet visit{taskSummary.ALL === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Quick, mobile-friendly access to today&apos;s assigned outlet visits.
            </p>
          </div>
          <DutyToggle initialActiveSessionId={activeSession?.id ?? null} />
        </div>

        <div className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Pending
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{taskSummary.PENDING}</p>
          </div>
          <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-500">
              In Progress
            </p>
            <p className="mt-1 text-lg font-semibold text-sky-800">{taskSummary.IN_PROGRESS}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">
              Done
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-800">{taskSummary.DONE}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">
              Missed
            </p>
            <p className="mt-1 text-lg font-semibold text-rose-800">{taskSummary.MISSED}</p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-4 rounded-3xl bg-slate-100 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Filter Status
            </p>
            <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {(["ALL", "PENDING", "IN_PROGRESS", "DONE", "MISSED"] as TaskFilter[]).map(
                (filterOption) => (
                  <Link
                    className={`inline-flex shrink-0 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                      activeFilter === filterOption
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                    href={buildTasksTodayHref(filterOption, activeSort)}
                    key={filterOption}
                  >
                    {filterOption === "ALL"
                      ? `All (${taskSummary.ALL})`
                      : `${canonicalTaskStatusLabel(filterOption)} (${taskSummary[filterOption]})`}
                  </Link>
                ),
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Sort
            </p>
            <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {([
                ["name", "Nama Outlet"],
                ["territory", "Territory"],
                ["status", "Status"],
              ] as const).map(([sortOption, label]) => (
                <Link
                  className={`inline-flex shrink-0 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                    activeSort === sortOption
                      ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  href={buildTasksTodayHref(activeFilter, sortOption)}
                  key={sortOption}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              {taskSummary.ALL === 0
                ? "No tasks generated for today yet."
                : "No tasks match the current filter."}
            </div>
          ) : (
            tasks.map((task) => {
              const canonicalStatus = toCanonicalTaskStatus(task.status);

              return (
                <Link
                  className="block rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-cyan-300 hover:bg-cyan-50/60"
                  href={`/tasks/${task.id}`}
                  key={task.id}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-slate-900">
                          {task.outlet.name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {task.outlet.storeCode} • {task.outlet.address}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${canonicalTaskStatusClasses(canonicalStatus)}`}
                      >
                        {canonicalTaskStatusLabel(canonicalStatus)}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                        <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Territory
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {task.outlet.territory ?? "-"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                        <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Schedule
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {scheduleDayLabel(task.scheduleDay)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                        <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Area
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {task.outlet.subdistrict ?? "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <span>Tap to open map and actions</span>
                      <p className="text-lg font-semibold text-slate-900">
                        Open
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
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
              No duty tracking ping recorded yet.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-white/60 bg-gradient-to-br from-cyan-500 to-blue-600 p-5 text-white shadow-lg shadow-cyan-900/20 sm:p-6">
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
