import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Upload, Boxes, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/import", label: "Import Data", icon: Upload },
  { to: "/stok", label: "Stok Gudang", icon: Boxes },
  { to: "/riwayat", label: "Riwayat", icon: Archive },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-6 border-b border-sidebar-border">
          <div className="text-xs uppercase tracking-widest text-sidebar-foreground/60">
            Sistem
          </div>
          <div className="text-lg font-semibold mt-1 leading-tight">
            PPIC Control
          </div>
          <div className="text-xs text-sidebar-foreground/60 mt-1">
            Dual-Track JIT
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
          PPIC: Muhammad Rizky
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-sidebar text-sidebar-foreground px-4 py-3 border-b border-sidebar-border">
          <div className="text-xs uppercase tracking-widest text-sidebar-foreground/60">
            PPIC Control
          </div>
          <div className="text-base font-semibold">Dual-Track JIT</div>
        </header>

        <div className="flex-1 px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-8 max-w-[1600px] w-full">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-sidebar border-t border-sidebar-border grid grid-cols-4 z-50">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium uppercase tracking-wide",
                  active
                    ? "text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                <span>{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
