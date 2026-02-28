import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === UserRole.SUPERVISOR ? "/supervisor" : "/tasks/today");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-white/60 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-900 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Field Force Visit Tasks
          </p>
          <h1 className="mt-4 max-w-lg text-3xl font-semibold leading-tight sm:text-4xl">
            One place for duty tracking, outlet visits, and supervisor oversight.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
            Sign in from a mobile browser to start duty, track live location, and
            complete check-in and check-out tasks directly at the outlet.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Track
              </p>
              <p className="mt-2 text-sm text-slate-100">
                Start duty and keep location pings running in the background.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Visit
              </p>
              <p className="mt-2 text-sm text-slate-100">
                Open today&apos;s outlet tasks and confirm visits on-site.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Monitor
              </p>
              <p className="mt-2 text-sm text-slate-100">
                Supervisors can review live location and team progress.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-slate-900/10 backdrop-blur sm:p-8">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
              Sign In
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              Start your workday
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Use a seeded account or an imported user account. Default imported
              password is set by <code>DEFAULT_IMPORTED_USER_PASSWORD</code>.
            </p>
          </div>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
