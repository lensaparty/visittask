import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === UserRole.SUPERVISOR ? "/supervisor" : "/tasks");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-8 shadow-xl shadow-slate-900/10 backdrop-blur">
        <div className="mb-8 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
            Field Force MVP
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Sign in to start visits
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Use a seeded account or an imported user account. Default imported
            password is set by <code>DEFAULT_IMPORTED_USER_PASSWORD</code>.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
