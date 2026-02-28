"use client";

import { UserRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

function itemClasses(active: boolean) {
  return active
    ? "bg-slate-900 text-white shadow-sm"
    : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700";
}

export function RoleNavbar({
  role,
}: {
  role: UserRole;
}) {
  const pathname = usePathname();

  const items: NavItem[] =
    role === UserRole.FIELD_FORCE
      ? [{ href: "/tasks/today", label: "Tasks Today" }]
      : [
          { href: "/supervisor", label: "Supervisor" },
          { href: "/admin/import", label: "Import" },
          { href: "/admin/assign", label: "Assign" },
        ];

  return (
    <nav
      aria-label="Primary"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/tasks/today" && pathname.startsWith("/tasks")) ||
          (item.href !== "/supervisor" && pathname.startsWith(item.href));

        return (
          <Link
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${itemClasses(active)}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
