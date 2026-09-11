"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import TradeForm from "@/components/TradeForm";
import { Loading, EmptyState, Button } from "@/components/ui";
import { Trade } from "@/lib/types";

export default function EditTradePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/trades/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) setTrade(j.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="p-4 md:p-8 page-transition max-w-5xl">
      <PageHeader title="Edit Trade" subtitle="Trade ki details update karo" />
      {loading ? (
        <Loading />
      ) : error || !trade ? (
        <>
          <EmptyState icon="⚠️" title="Trade nahi mila" sub="Ye trade delete ho chuka hai ya link galat hai" />
          <div className="flex justify-center mt-4">
            <Button variant="ghost" onClick={() => router.push("/journal")}>Journal pe wapas jao</Button>
          </div>
        </>
      ) : (
        <Suspense fallback={<Loading />}>
          <TradeForm tradeId={id} initialTrade={trade} />
        </Suspense>
      )}
    </div>
  );
}
