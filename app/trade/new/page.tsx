import PageHeader from "@/components/layout/PageHeader";
import TradeForm from "@/components/TradeForm";

export default function NewTradePage() {
  return (
    <div className="p-4 md:p-8 page-transition max-w-5xl">
      <PageHeader title="New Trade" subtitle="Har trade ka detail record rakho — yahi consistency banata hai" />
      <TradeForm />
    </div>
  );
}
