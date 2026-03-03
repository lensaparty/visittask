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
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                    Field Force Visit Tasks
                  </p>
                  <span className="inline-flex w-fit rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                    {user.role === UserRole.SUPERVISOR
                      ? "Supervisor / Admin"
                      : "Field Force"}
                  </span>
                </div>
                <h1 className="mt-2 break-words text-xl font-semibold text-slate-900 sm:text-2xl">
                  {user.name}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  {user.role === UserRole.SUPERVISOR
                    ? "Monitor live activity, import outlets, and manage assignments."
                    : "Track duty status and follow assigned outlet routes."}
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end lg:self-auto">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 sm:rounded-full"
                  href={
                    user.role === UserRole.SUPERVISOR
                      ? "/attendance/field-force/supervisor"
                      : "/attendance/field-force/route/today"
                  }
                >
                  Home
                </Link>
                <form action="/api/auth/logout" className="w-full sm:w-auto" method="post">
                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:rounded-full"
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
