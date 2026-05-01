import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MasterOrder } from "@/lib/ppic-types";

interface Props {
  order: MasterOrder | null;
  open: boolean;
  onClose: () => void;
}

export function EditOrderDialog({ order, open, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MasterOrder | null>(order);

  // Sync when order changes
  if (order && (!form || form.spk_number !== order.spk_number)) {
    setForm(order);
  }

  if (!form) return null;

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase
      .from("master_orders")
      .update({
        customer_name: form.customer_name,
        delivery_date: form.delivery_date,
        box_type: form.box_type,
        article_number: form.article_number,
        substance: form.substance,
        qty_order: form.qty_order,
        sheet_width: form.sheet_width,
        sheet_length: form.sheet_length,
        outgoing_instructions: form.outgoing_instructions,
        catatan_ppic: form.catatan_ppic,
      })
      .eq("spk_number", form.spk_number);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    toast.success("Perubahan tersimpan");
    onClose();
  }

  const set = <K extends keyof MasterOrder>(k: K, v: MasterOrder[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Detail SPK</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <section className="space-y-4">
            <h3 className="label-eyebrow">Identitas Order</h3>
            <Field label="No. SPK">
              <Input value={form.spk_number} readOnly className="bg-muted" />
            </Field>
            <Field label="Scheduling Number">
              <Input value={form.scheduling_number ?? ""} readOnly className="bg-muted" />
            </Field>
            <Field label="Nama Customer">
              <Input value={form.customer_name ?? ""} onChange={(e) => set("customer_name", e.target.value)} />
            </Field>
            <Field label="Target Pengiriman (Delivery Date)">
              <Input type="date" value={form.delivery_date ?? ""} onChange={(e) => set("delivery_date", e.target.value)} />
            </Field>
            <Field label="Tipe Box">
              <Input value={form.box_type ?? ""} onChange={(e) => set("box_type", e.target.value)} />
            </Field>
          </section>

          <section className="space-y-4">
            <h3 className="label-eyebrow">Spesifikasi Teknis</h3>
            <Field label="Article Number">
              <Input value={form.article_number ?? ""} onChange={(e) => set("article_number", e.target.value)} />
            </Field>
            <Field label="Jenis Kertas (Substance)">
              <Input value={form.substance ?? ""} onChange={(e) => set("substance", e.target.value)} />
            </Field>
            <Field label="Kuantitas (Qty Order)">
              <Input
                type="number"
                value={form.qty_order ?? ""}
                onChange={(e) => set("qty_order", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="Lebar Bahan">
              <div className="relative">
                <Input
                  type="number"
                  className="pr-10"
                  value={form.sheet_width ?? ""}
                  onChange={(e) => set("sheet_width", e.target.value === "" ? null : Number(e.target.value))}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground border-l border-input bg-muted">
                  <span className="px-2">mm</span>
                </span>
              </div>
            </Field>
            <Field label="Panjang Bahan">
              <div className="relative">
                <Input
                  type="number"
                  className="pr-10"
                  value={form.sheet_length ?? ""}
                  onChange={(e) => set("sheet_length", e.target.value === "" ? null : Number(e.target.value))}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground border-l border-input bg-muted">
                  <span className="px-2">mm</span>
                </span>
              </div>
            </Field>
          </section>

          <section className="md:col-span-2 space-y-2">
            <Label className="label-eyebrow">Outgoing Instructions (Notes from Sales)</Label>
            <Textarea
              value={form.outgoing_instructions ?? ""}
              onChange={(e) => set("outgoing_instructions", e.target.value)}
              rows={4}
              className="bg-[var(--notes-bg)] border-[var(--notes-border)]"
            />
          </section>

          <section className="md:col-span-2 space-y-2">
            <Label className="label-eyebrow">Catatan PPIC (Internal)</Label>
            <Textarea value={form.catatan_ppic ?? ""} onChange={(e) => set("catatan_ppic", e.target.value)} rows={3} />
          </section>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="label-eyebrow">{label}</Label>
      {children}
    </div>
  );
}
