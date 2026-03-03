import { UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskActions } from "@/components/task-actions";
import { TaskMap } from "@/components/task-map";
import { prisma } from "@/lib/prisma";
import { scheduleDayLabel } from "@/lib/schedule";
import { requireUser } from "@/lib/session";
import {
  canonicalTaskStatusLabel,
  toCanonicalTaskStatus,
} from "@/lib/task-status";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const user = await requireUser(UserRole.FIELD_FORCE);
  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: user.id,
    },
    include: {
      outlet: true,
      visit: true,
    },
  });

  if (!task) {
    notFound();
  }

  const canonicalStatus = toCanonicalTaskStatus(task.status);
  const relatedTasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      scheduledDate: task.scheduledDate,
      NOT: {
        id: task.id,
      },
    },
    include: {
      outlet: true,
    },
  });
  const nextTask = [...relatedTasks]
    .sort((left, right) => {
      const leftKey = [
        toCanonicalTaskStatus(left.status) === "DONE" ? "1" : "0",
        toCanonicalTaskStatus(left.status) === "MISSED" ? "2" : "0",
        left.outlet.name,
      ].join("|");
      const rightKey = [
        toCanonicalTaskStatus(right.status) === "DONE" ? "1" : "0",
        toCanonicalTaskStatus(right.status) === "MISSED" ? "2" : "0",
        right.outlet.name,
      ].join("|");

      return leftKey.localeCompare(rightKey);
    })
    .find((candidate) => {
      const candidateStatus = toCanonicalTaskStatus(candidate.status);

      return candidateStatus === "PENDING" || candidateStatus === "IN_PROGRESS";
    });

  return (
    <main className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="mb-5 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
              href="/attendance/field-force/route/today"
            >
              Back to Route
            </Link>
            {nextTask ? (
              <Link
                className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800 transition hover:border-cyan-300"
                href={`/attendance/field-force/tasks/${nextTask.id}`}
              >
                Next Task
              </Link>
            ) : null}
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Outlet Detail
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {task.outlet.name}
          </h2>
          <p className="text-sm leading-6 text-slate-600">{task.outlet.address}</p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Status
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {canonicalTaskStatusLabel(canonicalStatus)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Territory
            </p>
            <p className="mt-1 font-semibold text-slate-900">{task.outlet.territory ?? "-"}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Check-in Radius
            </p>
            <p className="mt-1 font-semibold text-slate-900">100 m</p>
          </div>
        </div>

        <TaskMap
          outletLatitude={task.outlet.latitude}
          outletLongitude={task.outlet.longitude}
          outletName={task.outlet.name}
        />
      </section>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Visit Metadata
          </p>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <dt>Store Code</dt>
              <dd className="font-medium text-slate-900">{task.outlet.storeCode}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Territory</dt>
              <dd className="font-medium text-slate-900">
                {task.outlet.territory ?? "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Schedule Day</dt>
              <dd className="font-medium text-slate-900">
                {scheduleDayLabel(task.scheduleDay)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Status</dt>
              <dd className="font-medium text-slate-900">
                {canonicalTaskStatusLabel(canonicalStatus)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Check-in</dt>
              <dd className="font-medium text-slate-900">
                {task.visit?.checkInTime
                  ? new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(task.visit.checkInTime)
                  : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Check-in Distance</dt>
              <dd className="font-medium text-slate-900">
                {task.visit?.checkInDistanceM != null
                  ? `${Math.round(task.visit.checkInDistanceM)} m`
                  : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Check-out</dt>
              <dd className="font-medium text-slate-900">
                {task.visit?.checkOutTime
                  ? new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(task.visit.checkOutTime)
                  : "-"}
              </dd>
            </div>
          </dl>
        </section>

        <TaskActions
          initialVisit={{
            checkInTime: task.visit?.checkInTime ?? null,
            checkOutTime: task.visit?.checkOutTime ?? null,
            checkInDistanceM: task.visit?.checkInDistanceM ?? null,
          }}
          outletLatitude={task.outlet.latitude}
          outletLongitude={task.outlet.longitude}
          status={canonicalStatus}
          taskId={task.id}
        />
      </aside>
    </main>
  );
}
