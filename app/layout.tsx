import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "TraderMind — Lucid PropFirm Journal",
  description: "Advanced trading journal for consistent profitable trading",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="flex min-h-screen bg-bg-950">
          <Sidebar />
          <main className="flex-1 ml-[240px] min-h-screen">
            {children}
          </main>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#141C28",
              color: "#E8EDF5",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
            },
            success: {
              iconTheme: { primary: "#00E676", secondary: "#05070D" },
            },
            error: {
              iconTheme: { primary: "#FF4560", secondary: "#05070D" },
            },
          }}
        />
      </body>
    </html>
  );
}
