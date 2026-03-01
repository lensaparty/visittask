import { UserRole } from "@prisma/client";
import { OutletImportForm } from "@/components/outlet-import-form";
import { requireUser } from "@/lib/session";

export default async function AdminImportPage() {
  await requireUser(UserRole.SUPERVISOR);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Admin Import
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Upload outlet workbook
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Import the latest `.xlsx` file to create or update outlets, schedules,
          and assigned users in one pass.
        </p>
      </section>
      <OutletImportForm
        allowReset
        buttonLabel="Upload Workbook"
        description="The first worksheet will be parsed and imported. Existing outlets are matched by Kode Toko and updated."
        title="Outlet Data"
      />
    </main>
  );
}
