import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ppic/AppShell";
import { useOrders } from "@/lib/ppic-queries";
import { formatDateID } from "@/lib/ppic-types";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/riwayat")({
  component: RiwayatPage,
});

function RiwayatPage() {
  const { data: orders = [], isLoading } = useOrders({ releasedOrFinished: true });

  async function markFinished(spk: string) {
    const { error } = await supabase.from("master_orders").update({ is_finished: true }).eq("spk_number", spk);
    if (error) toast.error(error.message);
    else toast.success("Tandai selesai produksi");
  }

  async function unrelease(spk: string) {
    const { error } = await supabase.from("master_orders").update({ is_released: false, is_finished: false }).eq("spk_number", spk);
    if (error) toast.error(error.message);
    else toast.success("Dikembalikan ke dashboard aktif");
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat SPK</h1>
          <p className="text-sm text-muted-foreground">SPK yang sudah dirilis ke mesin atau selesai produksi.</p>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <Th>No. SPK</Th>
                  <Th>Customer</Th>
                  <Th>Delivery</Th>
                  <Th>Substance</Th>
                  <Th>Qty</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Belum ada SPK yang dirilis.</td></tr>
                ) : orders.map((o) => (
                  <tr key={o.spk_number} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-mono font-semibold">{o.spk_number}</td>
                    <td className="px-3 py-2.5">{o.customer_name || "—"}</td>
                    <td className="px-3 py-2.5">{formatDateID(o.delivery_date)}</td>
                    <td className="px-3 py-2.5">{o.substance || "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{o.qty_order ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {o.is_finished ? (
                        <span className="badge-status badge-status-neutral">Selesai</span>
                      ) : (
                        <span className="badge-status badge-status-green">Dirilis</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!o.is_finished && (
                          <Button size="sm" variant="outline" className="h-8" onClick={() => markFinished(o.spk_number)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Selesai
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => unrelease(o.spk_number)} title="Kembalikan ke aktif">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${className ?? ""}`}>{children}</th>;
}
