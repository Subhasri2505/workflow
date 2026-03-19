"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GitBranch, List, FileText, Activity } from "lucide-react";

const navItems = [
  { to: "/", icon: GitBranch, label: "Workflows" },
  { to: "/audit", icon: FileText, label: "Audit Log" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <Activity className="h-5 w-5 text-blue-600" />
        <span className="text-base font-bold tracking-tight text-slate-900">
          FlowEngine
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.to ||
            (item.to === "/" && pathname.startsWith("/workflow"));
          return (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
