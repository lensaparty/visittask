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
    ? "border border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:text-white"
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
      ? [{ href: "/route/today", label: "Route Today" }]
      : [
          { href: "/supervisor", label: "Supervisor" },
          { href: "/admin/import", label: "Import" },
          { href: "/admin/outlets", label: "Outlets" },
          { href: "/admin/tsuk", label: "TSUK" },
          { href: "/admin/assign", label: "Assign" },
          { href: "/admin/users", label: "Users" },
        ];
  const mobileGridClass = items.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <nav
      aria-label="Primary"
      className={`grid gap-2 ${mobileGridClass} sm:flex sm:flex-wrap`}
    >
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/route/today" &&
            (pathname.startsWith("/route") || pathname.startsWith("/tasks"))) ||
          (item.href !== "/supervisor" && pathname.startsWith(item.href));

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium whitespace-nowrap transition sm:min-w-[6.75rem] sm:w-auto sm:rounded-full ${itemClasses(active)}`}
            href={item.href}
            key={item.href}
          >
            <span style={{ color: active ? "#ffffff" : "#334155" }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
