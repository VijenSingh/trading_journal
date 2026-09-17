"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrendingUp, Lock } from "lucide-react";
import { Card, Button } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) { setError(j.error || "Login failed"); return; }
      router.push(searchParams.get("next") || "/");
      router.refresh();
    } catch {
      setError("Login failed — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6 md:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple to-pink flex items-center justify-center mb-3 shadow-glow-purple">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div className="text-lg font-bold text-ink-100 tracking-tight">TraderMind</div>
          <div className="text-xs text-ink-400 font-mono">Lucid PropFirm</div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input
              type="password"
              autoFocus
              className="inp"
              style={{ paddingLeft: "2.25rem" }}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-xs text-red">{error}</div>}
          <Button type="submit" variant="primary" size="md" loading={loading} disabled={!password} className="w-full justify-center">
            Login
          </Button>
        </form>
      </Card>
    </div>
  );
}
