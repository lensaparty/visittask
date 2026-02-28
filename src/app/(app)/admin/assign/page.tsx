import { UserRole } from "@prisma/client";
import { AssignmentManager } from "@/components/assignment-manager";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function AdminAssignPage() {
  await requireUser(UserRole.SUPERVISOR);

  const users = await prisma.user.findMany({
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
  });

  return (
    <main className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Admin Assign
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Manage user-to-outlet assignments
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pick a field-force user, paste outlet codes, and save the active
          assignment list quickly from desktop or mobile.
        </p>
      </section>
      <AssignmentManager users={users} />
    </main>
  );
}
