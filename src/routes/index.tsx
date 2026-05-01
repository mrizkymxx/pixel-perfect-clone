import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ppic/AppShell";
import { DashboardTable } from "@/components/ppic/DashboardTable";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <DashboardTable />
    </AppShell>
  );
}
