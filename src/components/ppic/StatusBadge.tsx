import type { Tone } from "@/lib/ppic-types";

interface Props {
  tone: Tone;
  children: React.ReactNode;
}

export function StatusBadge({ tone, children }: Props) {
  const cls =
    tone === "red"
      ? "badge-status badge-status-red"
      : tone === "amber"
        ? "badge-status badge-status-amber"
        : tone === "green"
          ? "badge-status badge-status-green"
          : "badge-status badge-status-neutral";
  return <span className={cls}>{children}</span>;
}
