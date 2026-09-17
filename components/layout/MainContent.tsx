"use client";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  return (
    <main className={cn(
      "flex-1 min-h-screen w-full overflow-x-hidden",
      isLogin ? "" : "md:ml-[240px] pt-14 md:pt-0 print:ml-0 print:pt-0"
    )}>
      {children}
    </main>
  );
}
