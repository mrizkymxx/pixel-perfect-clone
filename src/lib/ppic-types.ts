export type StatusKaret = "BELUM_ORDER" | "MENUNGGU_DATANG" | "TERSEDIA";
export type StatusMounting = "BELUM_MOUNTING" | "PROSES_MOUNTING" | "SELESAI_MOUNTING";
export type StatusBahan = "WAITING" | "KOSONG" | "PERLU_POTONG" | "READY";
export type StatusVoting = null | "MENUNGGU_VOTING" | "SETUJU" | "DITOLAK";

export interface MasterOrder {
  spk_number: string;
  scheduling_number: string | null;
  customer_name: string | null;
  article_number: string | null;
  delivery_date: string | null;
  box_type: string | null;
  substance: string | null;
  qty_order: number | null;
  sheet_width: number | null;
  sheet_length: number | null;
  outgoing_instructions: string | null;
  status_karet: StatusKaret;
  status_mounting: StatusMounting;
  status_bahan: StatusBahan;
  status_voting: StatusVoting;
  catatan_ppic: string | null;
  is_released: boolean;
  is_finished: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMaterial {
  id: number;
  substance: string | null;
  sheet_width: number | null;
  sheet_length: number | null;
  qty_available: number | null;
  qty_palet: number | null;
  allocated_to: string | null;
  synced_at: string;
}

export const KARET_OPTIONS: { value: StatusKaret; label: string }[] = [
  { value: "BELUM_ORDER", label: "Belum Order" },
  { value: "MENUNGGU_DATANG", label: "Menunggu Datang" },
  { value: "TERSEDIA", label: "Tersedia" },
];

export const MOUNTING_OPTIONS: { value: StatusMounting; label: string }[] = [
  { value: "BELUM_MOUNTING", label: "Belum Mounting" },
  { value: "PROSES_MOUNTING", label: "Proses Mounting" },
  { value: "SELESAI_MOUNTING", label: "Selesai Mounting" },
];

export const BAHAN_OPTIONS: { value: StatusBahan; label: string }[] = [
  { value: "WAITING", label: "Waiting" },
  { value: "KOSONG", label: "Kosong" },
  { value: "PERLU_POTONG", label: "Perlu Potong" },
  { value: "READY", label: "Ready" },
];

export type Tone = "red" | "amber" | "green" | "neutral";

export const karetTone = (s: StatusKaret): Tone =>
  s === "TERSEDIA" ? "green" : s === "MENUNGGU_DATANG" ? "amber" : "red";

export const mountingTone = (s: StatusMounting): Tone =>
  s === "SELESAI_MOUNTING" ? "green" : s === "PROSES_MOUNTING" ? "amber" : "red";

export const bahanTone = (s: StatusBahan): Tone =>
  s === "READY" ? "green" : s === "PERLU_POTONG" ? "amber" : s === "KOSONG" ? "red" : "neutral";

export function canRelease(o: Pick<MasterOrder, "status_karet" | "status_mounting" | "status_bahan">) {
  return (
    o.status_karet === "TERSEDIA" &&
    o.status_mounting === "SELESAI_MOUNTING" &&
    (o.status_bahan === "READY" || o.status_bahan === "PERLU_POTONG")
  );
}

export function overallTone(o: MasterOrder): Tone {
  if (canRelease(o)) return "green";
  if (
    o.status_karet === "BELUM_ORDER" ||
    o.status_bahan === "KOSONG" ||
    o.status_voting === "DITOLAK"
  )
    return "red";
  return "amber";
}

export function overallLabel(o: MasterOrder): string {
  if (canRelease(o)) return "Siap Rilis";
  if (o.status_karet === "BELUM_ORDER") return "Hold — Karet";
  if (o.status_bahan === "KOSONG") return "Hold — Bahan";
  if (o.status_voting === "MENUNGGU_VOTING") return "Menunggu Voting";
  if (o.status_mounting === "PROSES_MOUNTING") return "Proses Mounting";
  return "Pre-Production";
}

export function formatDateID(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
