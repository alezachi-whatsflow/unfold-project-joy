import type { Negocio } from "@/types/vendas";

export function getDigitalScoreFromNotas(notas: string | null): number | null {
  if (!notas) return null;
  const match = notas.match(/Score Digital:\s*(\d+)\/10/);
  return match ? parseInt(match[1]) : null;
}

export function getOrigemDetalheFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Origem:\s*(.+)/);
  return match ? match[1].trim() : null;
}

export function getSiteFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Site:\s*(.+)/);
  return match ? match[1].trim() : null;
}

export function getPhoneFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Telefone:\s*(.+)/);
  return match ? match[1].trim() : null;
}

export function getNicheFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Segmento:\s*(.+)/);
  return match ? match[1].trim() : null;
}

export function getCityFromNotas(notas: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/Cidade:\s*(.+)/);
  return match ? match[1].trim() : null;
}

export function getScoreColor(score: number): string {
  if (score >= 8) return "#4ade80";
  if (score >= 5) return "#f59e0b";
  return "#f87171";
}

export function generatePaymentLink(negocio: Negocio): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/checkout/${negocio.id}`;
}
