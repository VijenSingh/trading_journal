import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import MainContent from "@/components/layout/MainContent";
import PWARegister from "@/components/PWARegister";
import DataSyncOnFocus from "@/components/DataSyncOnFocus";
import InstallPrompt from "@/components/InstallPrompt";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "TraderMind — Lucid PropFirm Journal",
  description: "Advanced trading journal for consistent profitable trading",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TraderMind" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F3FF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PWARegister />
        <DataSyncOnFocus />
        <InstallPrompt />
        <div className="flex min-h-screen bg-bg-950">
          <Sidebar />
          <MainContent>{children}</MainContent>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              color: "#1E1B2E",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "10px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "#F5F3FF" } },
            error: { iconTheme: { primary: "#F43F5E", secondary: "#F5F3FF" } },
          }}
        />
      </body>
    </html>
  );
}
