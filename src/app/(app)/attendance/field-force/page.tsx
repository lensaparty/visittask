import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function AttendanceFieldForceIndexPage() {
  const user = await requireUser();

  redirect(
    user.role === UserRole.SUPERVISOR
      ? "/attendance/field-force/supervisor"
      : "/attendance/field-force/route/today",
  );
}
