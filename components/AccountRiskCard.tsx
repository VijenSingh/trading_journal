"use client";
import Link from "next/link";
import { Card, CardTitle, Badge } from "@/components/ui";
import { useAccounts } from "@/lib/accounts";
import { ACTIVE_STATUSES } from "@/lib/types";
import { RuleMeters, hasRules } from "@/components/AccountRules";
import { formatCurrency } from "@/lib/utils";

// Dashboard: rule meters for every active account that has rules set, worst first.
export default function AccountRiskCard({ firm }: { firm: string }) {
  const { accounts } = useAccounts(firm);
  const order = { breach: 0, warn: 1, ok: 2 } as const;
  const list = accounts
    .filter(a => ACTIVE_STATUSES.includes(a.status) && hasRules(a.rules))
    .sort((x, y) => order[x.check.level] - order[y.check.level]);
  if (!list.length) return null;

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <CardTitle className="!mb-0">Account Risk</CardTitle>
        <Link href="/accounts" className="text-xs text-ink-400 hover:text-ink-100">Accounts →</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map(a => (
          <div key={a._id} className="p-3 rounded-xl bg-bg-700 border border-black/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-ink-100">{a.name} <span className="text-[11px] text-ink-500 font-normal">{a.propFirm} · {formatCurrency(a.balance)}</span></div>
              {a.check.level !== "ok" && <Badge variant={a.check.level === "breach" ? "red" : "amber"}>{a.check.level === "breach" ? "Rule toota" : "Savdhaan"}</Badge>}
            </div>
            {a.check.messages.length > 0 && (
              <div className={a.check.level === "breach" ? "text-[11px] text-red mb-2" : "text-[11px] text-amber mb-2"}>{a.check.messages.join(" · ")}</div>
            )}
            <RuleMeters a={a} />
          </div>
        ))}
      </div>
    </Card>
  );
}
