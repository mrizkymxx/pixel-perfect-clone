import jsPDF from "jspdf";
import type { MasterOrder } from "@/lib/ppic-types";
import { formatDateID } from "@/lib/ppic-types";

const COMPANY = "PT. CORRUGATED CARTON INDUSTRY";
const PPIC_NAME = "Muhammad Rizky";

function header(doc: jsPDF, title: string, docNo: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(COMPANY, 15, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Divisi PPIC — Production Planning & Inventory Control", 15, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 15, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
  doc.text(`No. Dokumen: ${docNo}    |    Tanggal Cetak: ${dateStr}`, 15, 36);

  doc.setLineWidth(0.4);
  doc.line(15, 39, 195, 39);
}

function sectionTitle(doc: jsPDF, label: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label, 15, y);
  doc.setLineWidth(0.2);
  doc.line(15, y + 1.5, 195, y + 1.5);
}

function kv(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(label, x, y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(value || "—", x, y + 5);
}

export function generateFormValidasi(o: MasterOrder) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "FORM VALIDASI PRODUKSI (PPIC)", `FVP-${o.spk_number}`);

  // Identitas
  sectionTitle(doc, "IDENTITAS SPK", 48);
  kv(doc, "No. SPK", o.spk_number, 15, 55);
  kv(doc, "Customer", o.customer_name || "—", 70, 55);
  kv(doc, "Article", o.article_number || "—", 140, 55);
  kv(doc, "Delivery Date", formatDateID(o.delivery_date), 15, 70);
  kv(doc, "Tipe Box", o.box_type || "—", 70, 70);
  kv(doc, "Qty Order", String(o.qty_order ?? "—"), 140, 70);

  // Checklist
  sectionTitle(doc, "CHECKLIST KESIAPAN PRODUKSI", 88);

  // Bahan
  doc.setDrawColor(120);
  doc.rect(15, 93, 6, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BAHAN BAKU (SHEET)", 25, 98);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Substance : ${o.substance || "—"}`, 25, 104);
  doc.text(
    `Ukuran    : ${o.sheet_width ?? "—"} x ${o.sheet_length ?? "—"} mm`,
    25,
    109,
  );
  doc.text(`Status    : ${o.status_bahan}`, 25, 114);
  doc.text("Sumber    : ______________________________________________", 25, 119);
  doc.text("Paraf Gudang/PPIC : ____________________", 25, 124);

  // Alat cetak
  doc.rect(15, 132, 6, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ALAT CETAK (RUBBER & MOUNTING)", 25, 137);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Status Karet     : ${o.status_karet}`, 25, 143);
  doc.text(`Status Mounting  : ${o.status_mounting}`, 25, 148);
  doc.text("Centang oleh Pre-press jika selesai :  [    ]", 25, 153);

  // Outgoing
  sectionTitle(doc, "INSTRUKSI PRODUKSI (OUTGOING INSTRUCTIONS)", 165);
  doc.setDrawColor(180);
  doc.rect(15, 168, 180, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(o.outgoing_instructions || "(tidak ada catatan)", 174);
  doc.text(lines, 18, 174);

  // Footer
  doc.setLineWidth(0.4);
  doc.line(15, 240, 195, 240);
  doc.setFontSize(9);
  doc.text(`Dibuat oleh PPIC : ${PPIC_NAME}`, 15, 250);
  doc.text("Tanda Tangan : ______________________________", 15, 258);
  doc.text(`Tanggal : ${formatDateID(new Date().toISOString())}`, 15, 266);

  doc.save(`FVP-${o.spk_number}.pdf`);
}

export function generateSuratPotong(o: MasterOrder, sourceStock?: { sheet_width: number | null; sheet_length: number | null; substance: string | null; qty_available: number | null }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "SURAT PERINTAH POTONG", `SPP-${o.spk_number}`);

  kv(doc, "No. SPK Tujuan", o.spk_number, 15, 50);
  kv(doc, "Customer", o.customer_name || "—", 80, 50);
  kv(doc, "Delivery Date", formatDateID(o.delivery_date), 150, 50);

  sectionTitle(doc, "INSTRUKSI PEMOTONGAN BAHAN", 70);

  // Two boxes: source vs target
  const sourceW = sourceStock?.sheet_width ?? "—";
  const sourceL = sourceStock?.sheet_length ?? "—";
  const sourceSub = sourceStock?.substance ?? o.substance ?? "—";
  const sourceQty = sourceStock?.qty_available ?? "—";

  doc.setDrawColor(80);
  doc.setLineWidth(0.3);
  // Left: Source
  doc.rect(15, 75, 87, 60);
  doc.setFillColor(245, 245, 245);
  doc.rect(15, 75, 87, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BAHAN SUMBER (Dari Stok Gudang)", 18, 81);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Substance : ${sourceSub}`, 18, 92);
  doc.text(`Ukuran    : ${sourceW} x ${sourceL} mm`, 18, 100);
  doc.text(`Qty Ambil : ${sourceQty} lembar`, 18, 108);

  // Right: Target
  doc.rect(108, 75, 87, 60);
  doc.setFillColor(245, 245, 245);
  doc.rect(108, 75, 87, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TARGET POTONG JADI (Ukuran Diminta)", 111, 81);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Substance : ${o.substance || "—"}`, 111, 92);
  doc.text(`UKURAN AKHIR : ${o.sheet_width ?? "—"} x ${o.sheet_length ?? "—"} mm`, 111, 100);
  doc.text(`Qty Jadi  : ${o.qty_order ?? "—"} lembar`, 111, 108);

  // Catatan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Catatan Khusus :", 15, 145);
  doc.setFont("helvetica", "normal");
  const noteLines = doc.splitTextToSize(o.catatan_ppic || "(tidak ada catatan khusus)", 180);
  doc.text(noteLines, 15, 151);

  // Approval
  sectionTitle(doc, "KOLOM PERSETUJUAN (WAJIB 3 TANDA TANGAN)", 175);
  const cols = [
    { x: 15, label: "Dibuat Oleh (PPIC)", name: PPIC_NAME },
    { x: 78, label: "Disetujui (Ka. Produksi)", name: "" },
    { x: 141, label: "Dilaksanakan (Operator)", name: "" },
  ];
  doc.setFontSize(8);
  cols.forEach((c) => {
    doc.setFont("helvetica", "bold");
    doc.text(String(c.label), c.x, 183);
    doc.setFont("helvetica", "normal");
    doc.text(c.name, c.x, 189);
    doc.line(c.x, 205, c.x + 55, 205);
    doc.text("Tanggal : __________", c.x, 212);
  });

  // Cut line
  doc.setLineDashPattern([2, 2], 0);
  doc.line(15, 230, 195, 230);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(String("- - - GUNTING DI SINI - - -"), 95, 229);
  doc.setTextColor(0);

  // Tag
  doc.setDrawColor(40);
  doc.setLineWidth(0.6);
  doc.rect(15, 235, 180, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TAG IDENTITAS BAHAN", 18, 243);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`No. SPK   : ${o.spk_number}`, 18, 252);
  doc.text(`Customer  : ${o.customer_name || "—"}`, 18, 259);
  doc.text(`Ukuran    : ${o.sheet_width ?? "—"} x ${o.sheet_length ?? "—"} mm`, 18, 266);
  doc.text(`Substance : ${o.substance || "—"}`, 18, 273);
  doc.text(`Qty       : ${o.qty_order ?? "—"} lembar`, 110, 252);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("LETAKKAN TAG INI DI ATAS TUMPUKAN BAHAN HASIL POTONGAN", 18, 281);

  doc.save(`SPP-${o.spk_number}.pdf`);
}
