import { useMemo, useState } from "react";
import { useOrders, useStock } from "@/lib/ppic-queries";
import {
  KARET_OPTIONS,
  MOUNTING_OPTIONS,
  BAHAN_OPTIONS,
  karetTone,
  mountingTone,
  bahanTone,
  overallTone,
  overallLabel,
  canRelease,
  formatDateID,
  daysUntil,
  type MasterOrder,
  type StatusKaret,
  type StatusMounting,
  type StatusBahan,
} from "@/lib/ppic-types";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Scissors, Pencil, Vote, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateFormValidasi, generateSuratPotong } from "@/lib/ppic-pdf";
import { EditOrderDialog } from "./EditOrderDialog";
import { VotingDialog } from "./VotingDialog";

type Filter = "all" | "ready" | "hold" | "preprod";

export function DashboardTable() {
  const { data: orders = [], isLoading } = useOrders({ activeOnly: true });
  const { data: stock = [] } = useStock();
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<MasterOrder | null>(null);
  const [voting, setVoting] = useState<MasterOrder | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter === "ready") return canRelease(o);
      if (filter === "hold") return overallTone(o) === "red";
      if (filter === "preprod") return overallTone(o) === "amber";
      return true;
    });
  }, [orders, filter]);

  async function updateField(spk: string, patch: Partial<MasterOrder>) {
    const { error } = await supabase.from("master_orders").update(patch).eq("spk_number", spk);
    if (error) toast.error(error.message);
  }

  async function release(o: MasterOrder) {
    const { error } = await supabase.from("master_orders").update({ is_released: true }).eq("spk_number", o.spk_number);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`SPK ${o.spk_number} dirilis ke mesin`);
  }

  function findStockFor(o: MasterOrder) {
    return stock.find(
      (s) =>
        s.substance === o.substance &&
        (s.sheet_width ?? 0) >= (o.sheet_width ?? 0) &&
        (s.sheet_length ?? 0) >= (o.sheet_length ?? 0),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pusat Kendali SPK</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} SPK aktif &middot; sortir berdasarkan tanggal kirim terdekat
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="ready">Siap Rilis</TabsTrigger>
            <TabsTrigger value="hold">On Hold</TabsTrigger>
            <TabsTrigger value="preprod">Pre-Production</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted text-left">
                <Th>No. SPK</Th>
                <Th>Customer</Th>
                <Th>Artikel</Th>
                <Th>Delivery</Th>
                <Th>Status Karet</Th>
                <Th>Status Mounting</Th>
                <Th>Status Bahan</Th>
                <Th>Status</Th>
                <Th className="text-right">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground">
                    Tidak ada SPK aktif. Import data dari menu Import Data.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const days = daysUntil(o.delivery_date);
                  const overdue = days !== null && days < 0;
                  const soon = days !== null && days >= 0 && days <= 3;
                  return (
                    <tr
                      key={o.spk_number}
                      className={cn(
                        "border-t border-border hover:bg-muted/30 transition-colors",
                        overdue && "row-overdue",
                        !overdue && soon && "row-soon",
                      )}
                    >
                      <Td>
                        <div className="font-mono font-semibold">{o.spk_number}</div>
                        {o.scheduling_number && (
                          <div className="text-[11px] text-muted-foreground font-mono">{o.scheduling_number}</div>
                        )}
                      </Td>
                      <Td>{o.customer_name || "—"}</Td>
                      <Td className="max-w-[160px] truncate">{o.article_number || "—"}</Td>
                      <Td>
                        <div>{formatDateID(o.delivery_date)}</div>
                        {days !== null && (
                          <div className={cn("text-[11px]", overdue ? "text-[var(--color-status-red)]" : soon ? "text-[var(--color-status-amber)]" : "text-muted-foreground")}>
                            {overdue ? `Lewat ${-days} hari` : days === 0 ? "Hari ini" : `${days} hari lagi`}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <InlineSelect
                          value={o.status_karet}
                          options={KARET_OPTIONS}
                          tone={karetTone(o.status_karet)}
                          onChange={(v) => updateField(o.spk_number, { status_karet: v as StatusKaret })}
                        />
                      </Td>
                      <Td>
                        <InlineSelect
                          value={o.status_mounting}
                          options={MOUNTING_OPTIONS}
                          tone={mountingTone(o.status_mounting)}
                          onChange={(v) => updateField(o.spk_number, { status_mounting: v as StatusMounting })}
                        />
                      </Td>
                      <Td>
                        <InlineSelect
                          value={o.status_bahan}
                          options={BAHAN_OPTIONS}
                          tone={bahanTone(o.status_bahan)}
                          onChange={(v) => updateField(o.spk_number, { status_bahan: v as StatusBahan })}
                        />
                      </Td>
                      <Td>
                        <StatusBadge tone={overallTone(o)}>{overallLabel(o)}</StatusBadge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {canRelease(o) && (
                            <Button size="sm" onClick={() => release(o)} className="bg-[var(--color-status-green)] hover:opacity-90 h-8">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Rilis
                            </Button>
                          )}
                          <IconBtn title="Cetak Form Validasi" onClick={() => generateFormValidasi(o)}>
                            <FileText className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            title="Cetak Surat Potong"
                            disabled={o.status_bahan !== "PERLU_POTONG"}
                            onClick={() => generateSuratPotong(o, findStockFor(o))}
                          >
                            <Scissors className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn title="Voting Pemotongan" onClick={() => setVoting(o)}>
                            <Vote className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn title="Edit Detail" onClick={() => setEditing(o)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditOrderDialog order={editing} open={!!editing} onClose={() => setEditing(null)} />
      <VotingDialog order={voting} stock={stock} open={!!voting} onClose={() => setVoting(null)} />
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>;
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <Button size="icon" variant="outline" className="h-8 w-8" onClick={onClick} title={title} disabled={disabled}>
      {children}
    </Button>
  );
}

function InlineSelect({
  value,
  options,
  tone,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  tone: "red" | "amber" | "green" | "neutral";
  onChange: (v: string) => void;
}) {
  const toneCls =
    tone === "red"
      ? "border-[var(--color-status-red)]/40 bg-[var(--color-status-red-bg)] text-[var(--color-status-red)]"
      : tone === "amber"
        ? "border-[var(--color-status-amber)]/40 bg-[var(--color-status-amber-bg)]"
        : tone === "green"
          ? "border-[var(--color-status-green)]/40 bg-[var(--color-status-green-bg)] text-[var(--color-status-green)]"
          : "";
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-8 text-xs font-semibold uppercase tracking-wide w-[170px]", toneCls)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
