import { UserRole } from "@prisma/client";
import Link from "next/link";
import { RoleNavbar } from "@/components/role-navbar";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-white/60 bg-white/90 px-4 py-4 shadow-lg shadow-slate-900/5 backdrop-blur sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                    Field Force Visit Tasks
                  </p>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                    {user.role === UserRole.SUPERVISOR
                      ? "Supervisor / Admin"
                      : "Field Force"}
                  </span>
                </div>
                <h1 className="mt-2 truncate text-xl font-semibold text-slate-900 sm:text-2xl">
                  {user.name}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {user.role === UserRole.SUPERVISOR
                    ? "Monitor live activity, import outlets, and manage assignments."
                    : "Track duty status, open tasks, and complete outlet visits."}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-auto">
                <Link
                  className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 sm:inline-flex"
                  href={user.role === UserRole.SUPERVISOR ? "/supervisor" : "/tasks/today"}
                >
                  Home
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    type="submit"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>

            <RoleNavbar role={user.role} />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
