import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { AppShell } from "@/components/ppic/AppShell";
import { Button } from "@/components/ppic/../ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSetting } from "@/lib/ppic-queries";
import { toast } from "sonner";
import { Upload, RefreshCw, FileSpreadsheet, Cloud } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/import")({
  component: ImportPage,
});

interface ImportSummary {
  inserted: number;
  updated: number;
  unchanged: number;
  preview: { spk_number: string; customer_name: string | null }[];
}

function pickField(row: Record<string, unknown>, names: string[]): string | null {
  const keys = Object.keys(row);
  for (const name of names) {
    const found = keys.find((k) => k.trim().toLowerCase() === name.trim().toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return null;
}

function parseDate(s: string | null): string | null {
  if (!s) return null;
  // Accept DD/MM/YYYY, YYYY-MM-DD, etc.
  const t = s.trim();
  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(t);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(t);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const sheetUrlSetting = useSetting("warehouse_sheet_url");
  const [sheetUrl, setSheetUrl] = useState("");
  const qc = useQueryClient();

  // sync setting -> local state
  if (sheetUrlSetting.data && !sheetUrl) setSheetUrl(sheetUrlSetting.data);

  async function handleFile(file: File) {
    setImporting(true);
    setSummary(null);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const rows = result.data;
          const mapped = rows
            .map((r) => {
              const spk = pickField(r, [
                "Bring production notes into outgoing instructions",
                "spk_number",
                "SPK",
                "No SPK",
              ]);
              if (!spk) return null;
              return {
                spk_number: spk,
                scheduling_number: pickField(r, ["Scheduling a single number", "scheduling_number"]),
                customer_name: pickField(r, ["customer name", "Customer Name", "customer_name"]),
                article_number: pickField(r, ["customer article number", "article_number", "Article"]),
                delivery_date: parseDate(pickField(r, ["Delivery date", "delivery_date"])),
                box_type: pickField(r, ["box plot", "box_type"]),
                substance: pickField(r, ["paper", "substance"]),
                qty_order: Number(pickField(r, ["orders", "qty_order"])) || null,
                sheet_width: Number(pickField(r, ["Paper width", "sheet_width"])) || null,
                sheet_length: Number(pickField(r, ["Paper length", "sheet_length"])) || null,
                outgoing_instructions: pickField(r, ["note", "outgoing_instructions"]),
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

          if (mapped.length === 0) {
            toast.error("Tidak ada baris valid yang bisa diimport. Periksa header CSV.");
            setImporting(false);
            return;
          }

          // Get existing keys to compute summary
          const spkList = mapped.map((m) => m.spk_number);
          const { data: existing } = await supabase
            .from("master_orders")
            .select("spk_number")
            .in("spk_number", spkList);
          const existingSet = new Set((existing ?? []).map((e) => e.spk_number));

          // Upsert (do NOT touch status fields — defaults preserved on insert; explicit update of business fields only)
          const { error } = await supabase
            .from("master_orders")
            .upsert(mapped, { onConflict: "spk_number", ignoreDuplicates: false });
          if (error) throw error;

          const inserted = mapped.filter((m) => !existingSet.has(m.spk_number)).length;
          const updated = mapped.length - inserted;

          setSummary({
            inserted,
            updated,
            unchanged: 0,
            preview: mapped.slice(0, 8).map((m) => ({ spk_number: m.spk_number, customer_name: m.customer_name })),
          });
          toast.success(`Import selesai: ${inserted} baru, ${updated} diperbarui`);
          qc.invalidateQueries({ queryKey: ["orders"] });
        } catch (e) {
          toast.error("Gagal import: " + (e as Error).message);
        } finally {
          setImporting(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      },
      error: (err) => {
        toast.error("Parsing CSV gagal: " + err.message);
        setImporting(false);
      },
    });
  }

  async function saveSheetUrl() {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "warehouse_sheet_url", value: sheetUrl }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("URL Google Sheets tersimpan");
    qc.invalidateQueries({ queryKey: ["setting", "warehouse_sheet_url"] });
  }

  async function syncWarehouse() {
    if (!sheetUrl) {
      toast.error("URL Google Sheets belum diisi");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(sheetUrl);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
      const rows = result.data
        .map((r) => ({
          substance: pickField(r, ["substance", "paper", "jenis"]),
          sheet_width: Number(pickField(r, ["sheet_width", "width", "lebar"])) || null,
          sheet_length: Number(pickField(r, ["sheet_length", "length", "panjang"])) || null,
          qty_available: Number(pickField(r, ["qty_available", "qty", "tersedia", "stok"])) || null,
          qty_palet: Number(pickField(r, ["qty_palet", "palet"])) || null,
          allocated_to: pickField(r, ["allocated_to", "alokasi", "customer"]),
        }))
        .filter((r) => r.substance);

      if (rows.length === 0) {
        toast.error("Tidak ada baris stok yang bisa diparse. Periksa header sheet.");
        setSyncing(false);
        return;
      }

      // Truncate then insert
      await supabase.from("stock_materials").delete().neq("id", -1);
      const { error } = await supabase.from("stock_materials").insert(rows);
      if (error) throw error;

      const now = new Date();
      setLastSync(now.toISOString());
      toast.success(`Sinkronisasi sukses: ${rows.length} baris stok`);
      qc.invalidateQueries({ queryKey: ["stock"] });
    } catch (e) {
      toast.error("Sync gagal: " + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Data</h1>
          <p className="text-sm text-muted-foreground">
            Upload CSV dari Sales atau sinkronkan stok gudang dari Google Sheets.
          </p>
        </div>

        {/* Section A — CSV Sales */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Section A — Import CSV Sales</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upsert berdasarkan kolom <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Bring production notes into outgoing instructions</code> sebagai SPK Number. Status PPIC tidak ditimpa.
          </p>

          <label
            className="border-2 border-dashed border-border rounded-md p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <div className="text-sm font-medium">Klik atau seret file CSV/Excel di sini</div>
            <div className="text-xs text-muted-foreground mt-1">.csv (UTF-8)</div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              disabled={importing}
            />
          </label>

          {importing && <div className="text-sm text-muted-foreground mt-3">Memproses...</div>}

          {summary && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <Stat label="Baru" value={summary.inserted} tone="green" />
                <Stat label="Diperbarui" value={summary.updated} tone="amber" />
                <Stat label="Total Diproses" value={summary.inserted + summary.updated} tone="neutral" />
              </div>
              <div className="text-xs label-eyebrow mb-2">Preview SPK</div>
              <ul className="text-sm space-y-1">
                {summary.preview.map((p) => (
                  <li key={p.spk_number} className="flex justify-between border-b border-border py-1">
                    <span className="font-mono">{p.spk_number}</span>
                    <span className="text-muted-foreground">{p.customer_name || "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Section B — Google Sheets sync */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-1">
            <Cloud className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Section B — Sinkronisasi Stok Gudang</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            URL Google Sheets format CSV export. Sinkronisasi akan menghapus seluruh isi tabel stok lama dan menggantinya.
          </p>

          <div className="space-y-3">
            <div>
              <Label className="label-eyebrow">URL Google Sheets (CSV Export)</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                  className="font-mono text-xs"
                />
                <Button variant="outline" onClick={saveSheetUrl}>Simpan</Button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={syncWarehouse} disabled={syncing || !sheetUrl}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sinkronisasi..." : "Sinkronisasi Gudang Sekarang"}
              </Button>
              {lastSync && (
                <div className="text-xs text-muted-foreground">
                  Terakhir disinkronkan: {new Date(lastSync).toLocaleString("id-ID")}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "neutral" }) {
  const cls =
    tone === "green"
      ? "bg-[var(--color-status-green-bg)] text-[var(--color-status-green)]"
      : tone === "amber"
        ? "bg-[var(--color-status-amber-bg)]"
        : "bg-muted";
  return (
    <div className={`rounded-md px-4 py-3 ${cls}`}>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wide font-semibold">{label}</div>
    </div>
  );
}
