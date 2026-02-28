import { UserRole } from "@prisma/client";
import { UserAdminPanel } from "@/components/user-admin-panel";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function AdminUsersPage() {
  await requireUser(UserRole.SUPERVISOR);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      territory: true,
      territoryGroup: true,
    },
    orderBy: [
      {
        role: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return (
    <main className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Admin Users
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Manage user accounts
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Edit profile data or delete accounts directly from the admin area.
        </p>
      </section>

      <UserAdminPanel users={users} />
    </main>
  );
}
