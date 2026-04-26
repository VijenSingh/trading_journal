"use client";

import {cn} from "../../lib/utils";
import { ReactNode, ButtonHTMLAttributes } from "react";

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("bg-bg-800 border border-white/[0.06] rounded-2xl", className)}>
      {children}
    </div>
  );
}

// ─── CardTitle ───────────────────────────────────────────────────────────────
export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-4", className)}>
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
type BadgeVariant = "green" | "red" | "blue" | "amber" | "purple" | "gray";
const badgeClasses: Record<BadgeVariant, string> = {
  green:  "bg-green/10 text-green border-green/20",
  red:    "bg-red/10 text-red border-red/20",
  blue:   "bg-blue/10 text-blue border-blue/20",
  amber:  "bg-amber/10 text-amber border-amber/20",
  purple: "bg-purple/10 text-purple border-purple/20",
  gray:   "bg-ink-500/20 text-ink-300 border-ink-400/20",
};
export function Badge({ variant = "gray", children, className }: { variant?: BadgeVariant; children: ReactNode; className?: string }) {
  return (
    <span className={cn("badge border", badgeClasses[variant], className)}>
      {children}
    </span>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}
const btnVariants = {
  primary: "bg-green text-bg-950 hover:bg-green-bright font-semibold shadow-glow",
  danger:  "bg-red/10 text-red border border-red/20 hover:bg-red/20",
  ghost:   "bg-bg-700 text-ink-200 border border-white/[0.06] hover:bg-bg-600 hover:text-ink-100",
  outline: "bg-transparent text-ink-200 border border-white/[0.1] hover:border-white/[0.2] hover:text-ink-100",
};
const btnSizes = { sm:"px-3 py-1.5 text-xs rounded-lg", md:"px-4 py-2.5 text-sm rounded-xl", lg:"px-6 py-3 text-base rounded-xl" };
export function Button({ variant="ghost", size="md", loading, children, className, disabled, ...rest }: BtnProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        btnVariants[variant], btnSizes[size], className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : null}
      {children}
    </button>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "green" | "red" | "blue" | "amber" | "default";
  icon?: ReactNode;
}
const valueColors = { green:"text-green", red:"text-red", blue:"text-blue", amber:"text-amber", default:"text-ink-100" };
export function StatCard({ label, value, sub, color = "default", icon }: StatCardProps) {
  return (
    <div className="stat-card card-hover">
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-3">{label}</div>
        {icon && <div className="text-ink-400">{icon}</div>}
      </div>
      <div className={cn("text-2xl font-bold font-mono tracking-tight", valueColors[color])}>{value}</div>
      {sub && <div className="text-[11px] text-ink-400 mt-1.5 font-mono">{sub}</div>}
    </div>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <div className="text-sm font-medium text-ink-300 mb-1">{title}</div>
      {sub && <div className="text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider() {
  return <div className="h-px bg-white/[0.05] my-6" />;
}

// ─── Loading ─────────────────────────────────────────────────────────────────
export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex gap-1">
        {[0,1,2].map(i=>(
          <div key={i} className="w-2 h-2 rounded-full bg-green animate-bounce" style={{ animationDelay:`${i*0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Label({ children }: { children: ReactNode }) {
  return <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-widest">{children}</label>;
}
