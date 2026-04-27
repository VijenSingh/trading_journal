"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, PlusCircle, BookOpen, BarChart3,
  CalendarDays, Target, BookMarked, Brain, TrendingUp,
  Building2, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/account", icon: Building2, label: "Performance" },
  { href: "/trade/new", icon: PlusCircle, label: "New Trade" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/monthly", icon: CalendarDays, label: "Monthly P&L" },
  { href: "/mistakes", icon: Target, label: "Mistakes" },
  { href: "/rules", icon: BookMarked, label: "Rules" },
  { href: "/mindset", icon: Brain, label: "Mindset" },
];

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {nav.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
              active ? "nav-active" : "text-ink-300 hover:bg-bg-700 hover:text-ink-100"
            )}
          >
            <Icon size={16} className={active ? "text-green" : "text-ink-400"} />
            {label}
            {label === "New Trade" && (
              <span className="ml-auto text-[10px] bg-green/10 text-green border border-green/20 rounded px-1.5 py-0.5 font-mono">+</span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const Logo = () => (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center flex-shrink-0">
        <TrendingUp size={18} className="text-green" />
      </div>
      <div>
        <div className="text-[15px] font-bold text-ink-100 tracking-tight">TraderMind</div>
        <div className="text-[11px] text-ink-400 font-mono">Lucid PropFirm</div>
      </div>
    </div>
  );

  const Footer = () => (
    <div className="px-4 py-4 border-t border-white/[0.05] space-y-2">
      <div className="flex items-center gap-2 px-2">
        <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
        <span className="text-[11px] text-ink-400 font-mono">MongoDB Connected</span>
      </div>
      <div className="text-[10px] text-ink-500 px-2 font-mono">v2.0.0 — TraderMind</div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR (≥768px) ── */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-[240px] bg-bg-900 border-r border-white/[0.05] flex-col z-50">
        <div className="px-6 py-6 border-b border-white/[0.05]">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <Footer />
      </aside>

      {/* ── MOBILE TOPBAR (< 768px) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-bg-900 border-b border-white/[0.05] flex items-center justify-between px-4 z-50">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-700 text-ink-300 hover:bg-bg-600 transition-all"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          {/* Drawer */}
          <div className="relative w-[280px] h-full bg-bg-900 border-r border-white/[0.05] flex flex-col animate-slide-up">
            <div className="px-4 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-bg-700 text-ink-300"
              >
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavLinks onClose={() => setMobileOpen(false)} />
            </nav>
            <Footer />
          </div>
        </div>
      )}
    </>
  );
}
