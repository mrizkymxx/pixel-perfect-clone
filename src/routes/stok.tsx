import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/ppic/AppShell";
import { useStock } from "@/lib/ppic-queries";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/stok")({
  component: StokPage,
});

function StokPage() {
  const { data: stock = [], isLoading } = useStock();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return stock;
    return stock.filter((s) =>
      [s.substance, s.sheet_width, s.sheet_length, s.allocated_to]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [stock, q]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-end gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stok Gudang</h1>
            <p className="text-sm text-muted-foreground">
              {stock.length} baris stok dari sinkronisasi terakhir.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari substance / ukuran" className="pl-9" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Substance</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ukuran (W × L mm)</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Qty Tersedia</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Qty Palet</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dialokasikan Untuk</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sync</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">Belum ada data stok. Sinkronkan dari menu Import Data.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium">{s.substance || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-sm">{s.sheet_width ?? "—"} × {s.sheet_length ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.qty_available ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.qty_palet ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.allocated_to || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(s.synced_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
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
