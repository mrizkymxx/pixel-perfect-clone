import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MasterOrder, StockMaterial } from "@/lib/ppic-types";

interface Props {
  order: MasterOrder | null;
  stock: StockMaterial[];
  open: boolean;
  onClose: () => void;
}

export function VotingDialog({ order, stock, open, onClose }: Props) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Find best alternative (same substance, larger or equal both dims, smallest waste)
  const candidate = useMemo(() => {
    if (!order || !order.sheet_width || !order.sheet_length) return null;
    const matches = stock.filter(
      (s) =>
        (!order.substance || s.substance === order.substance) &&
        (s.sheet_width ?? 0) >= (order.sheet_width ?? 0) &&
        (s.sheet_length ?? 0) >= (order.sheet_length ?? 0) &&
        (s.qty_available ?? 0) > 0,
    );
    matches.sort((a, b) => {
      const wasteA = ((a.sheet_width ?? 0) - (order.sheet_width ?? 0)) + ((a.sheet_length ?? 0) - (order.sheet_length ?? 0));
      const wasteB = ((b.sheet_width ?? 0) - (order.sheet_width ?? 0)) + ((b.sheet_length ?? 0) - (order.sheet_length ?? 0));
      return wasteA - wasteB;
    });
    return matches[0] ?? null;
  }, [order, stock]);

  if (!order) return null;

  async function decide(decision: "SETUJU" | "DITOLAK") {
    setSaving(true);
    const { error } = await supabase
      .from("master_orders")
      .update({
        status_voting: decision,
        status_bahan: decision === "SETUJU" ? "PERLU_POTONG" : "KOSONG",
        catatan_ppic: note ? note : order!.catatan_ppic,
      })
      .eq("spk_number", order!.spk_number);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Voting ${decision === "SETUJU" ? "disetujui" : "ditolak"}`);
    onClose();
  }

  const wasteW = candidate ? (candidate.sheet_width ?? 0) - (order.sheet_width ?? 0) : null;
  const wasteL = candidate ? (candidate.sheet_length ?? 0) - (order.sheet_length ?? 0) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Voting Pemotongan Bahan — SPK {order.spk_number}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="border rounded-md p-4 bg-muted">
            <div className="label-eyebrow mb-2">Diminta</div>
            <div className="text-sm font-semibold">{order.substance || "—"}</div>
            <div className="text-2xl font-bold tracking-tight">{order.sheet_width} × {order.sheet_length} <span className="text-sm font-normal text-muted-foreground">mm</span></div>
            <div className="text-xs text-muted-foreground mt-1">Qty {order.qty_order}</div>
          </div>
          <div className="border rounded-md p-4">
            <div className="label-eyebrow mb-2">Pengganti Tersedia</div>
            {candidate ? (
              <>
                <div className="text-sm font-semibold">{candidate.substance || "—"}</div>
                <div className="text-2xl font-bold tracking-tight">{candidate.sheet_width} × {candidate.sheet_length} <span className="text-sm font-normal text-muted-foreground">mm</span></div>
                <div className="text-xs text-muted-foreground mt-1">Stok {candidate.qty_available} lbr</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Tidak ada bahan oversize yang cocok di stok.</div>
            )}
          </div>
        </div>

        {candidate && (
          <div className="border-l-4 border-[var(--color-status-amber)] bg-[var(--color-status-amber-bg)] px-4 py-3 mt-3 rounded-sm">
            <div className="label-eyebrow">Estimasi Waste</div>
            <div className="text-sm">
              Lebar: <strong>+{wasteW} mm</strong> &nbsp;·&nbsp; Panjang: <strong>+{wasteL} mm</strong>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Label className="label-eyebrow">Catatan PPIC</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Alasan keputusan, instruksi tambahan, dsb." />
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button variant="destructive" onClick={() => decide("DITOLAK")} disabled={saving}>Ditolak — Lobi Sales</Button>
          <Button onClick={() => decide("SETUJU")} disabled={saving || !candidate}>Setuju — Lanjut Potong</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
