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
    <main className="w-full">
      <AssignmentManager users={users} />
    </main>
  );
}
