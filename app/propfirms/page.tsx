"use client";
import PageHeader from "@/components/layout/PageHeader";
import PropFirmInvestmentCard from "@/components/PropFirmInvestmentCard";
import PropFirmCharts from "@/components/PropFirmCharts";
import PropFirmComparisonTable from "@/components/PropFirmComparisonTable";

export default function PropFirmsPage() {
  return (
    <div className="p-4 md:p-8 page-transition">
      <PageHeader title="Prop Firms" subtitle="Har firm ka investment aur payout track karo" />
      <PropFirmCharts />
      <PropFirmComparisonTable />
      <PropFirmInvestmentCard />
    </div>
  );
}
