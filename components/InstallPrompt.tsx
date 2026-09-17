"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tm_install_dismissed";

export default function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // default hidden until we know it's dismissible

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed || pathname === "/login") return null;

  const install = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 print:hidden">
      <div className="bg-bg-800 border border-black/[0.08] rounded-2xl shadow-card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple to-pink flex items-center justify-center flex-shrink-0">
          <Download size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-ink-100">App install karo</div>
          <div className="text-[11px] text-ink-400">Home screen se seedha access, jaisa native app</div>
        </div>
        <button type="button" onClick={install}
          className="text-xs font-semibold text-purple hover:text-purple/80 flex-shrink-0 whitespace-nowrap">
          Install
        </button>
        <button type="button" onClick={dismiss} className="text-ink-500 hover:text-ink-300 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
