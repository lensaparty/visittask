import { UserRole } from "@prisma/client";
import Link from "next/link";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-white/60 bg-white/85 px-6 py-5 shadow-lg shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                Field Force Visit Tasks
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                {user.name}
              </h1>
              <p className="text-sm text-slate-600">
                {user.role === UserRole.SUPERVISOR
                  ? "Supervisor dashboard"
                  : "Field force workboard"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {user.role === UserRole.FIELD_FORCE ? (
                <Link
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
                  href="/tasks"
                >
                  Tasks Today
                </Link>
              ) : (
                <>
                  <Link
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
                    href="/supervisor"
                  >
                    Dashboard
                  </Link>
                  <Link
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
                    href="/admin/import"
                  >
                    Admin Import
                  </Link>
                  <Link
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
                    href="/admin/assign"
                  >
                    Admin Assign
                  </Link>
                </>
              )}
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
        </header>
        {children}
      </div>
    </div>
  );
}
