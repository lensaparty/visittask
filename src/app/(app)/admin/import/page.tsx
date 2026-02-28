import { UserRole } from "@prisma/client";
import { OutletImportForm } from "@/components/outlet-import-form";
import { requireUser } from "@/lib/session";

export default async function AdminImportPage() {
  await requireUser(UserRole.SUPERVISOR);

  return (
    <main className="mx-auto w-full max-w-3xl">
      <OutletImportForm
        buttonLabel="Upload Workbook"
        description="The first worksheet will be parsed and imported. Existing outlets are matched by Kode Toko and updated."
        title="Admin Import"
      />
    </main>
  );
}
