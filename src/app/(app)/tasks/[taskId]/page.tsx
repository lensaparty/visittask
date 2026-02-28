import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { TaskActions } from "@/components/task-actions";
import { TaskMap } from "@/components/task-map";
import { prisma } from "@/lib/prisma";
import { scheduleDayLabel } from "@/lib/schedule";
import { requireUser } from "@/lib/session";

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
    },
  });

  if (!task) {
    notFound();
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
        <div className="mb-5 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Outlet Detail
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {task.outlet.name}
          </h2>
          <p className="text-sm leading-6 text-slate-600">{task.outlet.address}</p>
        </div>

        <TaskMap
          outletLatitude={task.outlet.latitude}
          outletLongitude={task.outlet.longitude}
          outletName={task.outlet.name}
        />
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
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
              <dd className="font-medium text-slate-900">{task.status}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Check-in</dt>
              <dd className="font-medium text-slate-900">
                {task.checkInAt
                  ? new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(task.checkInAt)
                  : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Check-out</dt>
              <dd className="font-medium text-slate-900">
                {task.checkOutAt
                  ? new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(task.checkOutAt)
                  : "-"}
              </dd>
            </div>
          </dl>
        </section>

        <TaskActions
          canCheckIn={!task.checkInAt}
          canCheckOut={Boolean(task.checkInAt && !task.checkOutAt)}
          taskId={task.id}
        />
      </aside>
    </main>
  );
}
