import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export interface FaturaIssuer {
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  primaryColor?: string;
  website?: string;
}

export interface FaturaClient {
  name: string;
  email?: string;
  cnpj?: string;
}

export interface FaturaLicense {
  base_attendants: number;
  extra_attendants: number;
  base_devices_web: number;
  extra_devices_web: number;
  base_devices_meta: number;
  extra_devices_meta: number;
  has_ai_module: boolean;
  ai_module_value?: number;
  monthly_value: number;
  starts_at?: string | null;
  expires_at?: string | null;
  plan?: string;
}

export interface FaturaAttendant {
  id: string;
  full_name?: string | null;
  email?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
}

interface FaturaProps {
  issuer: FaturaIssuer;
  client: FaturaClient;
  license: FaturaLicense;
  attendants: FaturaAttendant[];
  referenceMonth?: string;
  observations?: string;
  invoiceNumber?: string;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}

// Tier pricing: extra attendant unit price based on total attendant count
function attTierPrice(total: number): number {
  if (total >= 21) return 60;
  if (total >= 11) return 70;
  if (total >= 6) return 75;
  return 80;
}

// Tier pricing: extra web device unit price based on total web device count
function webDevTierPrice(total: number): number {
  if (total >= 21) return 100;
  if (total >= 6) return 125;
  return 150;
}

export function FaturaView({
  issuer,
  client,
  license,
  attendants,
  referenceMonth,
  observations,
  invoiceNumber,
}: FaturaProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const primary = issuer.primaryColor || '#16a34a';

  const totalAtt = license.base_attendants + license.extra_attendants;
  const totalWeb = license.base_devices_web + license.extra_devices_web;
  const totalMeta = license.base_devices_meta + license.extra_devices_meta;

  const attUnitPrice = attTierPrice(totalAtt);
  const webUnitPrice = webDevTierPrice(totalWeb);
  const metaUnitPrice = 80;
  const aiValue = license.ai_module_value ?? 250;

  // Attendant rows: first base_attendants are "included", rest are extras
  const attendantRows = attendants.map((a, i) => ({
    ...a,
    isExtra: i >= license.base_attendants,
    extraCost: i >= license.base_attendants ? attUnitPrice : 0,
  }));
  const totalAttCost = attendantRows.reduce((s, r) => s + r.extraCost, 0);

  // Web device rows
  const webRows = Array.from({ length: totalWeb }, (_, i) => ({
    id: `web-${i}`,
    label: `WhatsApp Web ${i + 1}`,
    platform: 'WhatsApp Web',
    isExtra: i >= license.base_devices_web,
    extraCost: i >= license.base_devices_web ? webUnitPrice : 0,
  }));
  const totalWebCost = webRows.reduce((s, r) => s + r.extraCost, 0);

  // Meta device rows
  const metaRows = Array.from({ length: totalMeta }, (_, i) => ({
    id: `meta-${i}`,
    label: `Meta Business ${i + 1}`,
    platform: 'Meta Business',
    isExtra: i >= license.base_devices_meta,
    extraCost: i >= license.base_devices_meta ? metaUnitPrice : 0,
  }));
  const totalMetaCost = metaRows.reduce((s, r) => s + r.extraCost, 0);

  const deviceRows = [...webRows, ...metaRows];
  const totalDevCost = totalWebCost + totalMetaCost;

  const additionalsCost = license.has_ai_module ? aiValue : 0;
  const grandTotal = license.monthly_value;

  const now = new Date();
  const refMonth = referenceMonth || now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const invNumber = invoiceNumber || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Fatura ${invNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
            .fatura { max-width: 860px; margin: 0 auto; padding: 40px 48px; }
            .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; border-bottom: 2px solid ${primary}; padding-bottom: 20px; }
            .issuer-name { font-size: 20px; font-weight: 800; color: ${primary}; }
            .issuer-sub { font-size: 11px; color: #555; margin-top: 4px; }
            .invoice-meta { text-align: right; }
            .invoice-meta .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
            .invoice-meta .value { font-size: 13px; font-weight: 600; color: #111; }
            .invoice-meta .ref { font-size: 16px; font-weight: 700; color: ${primary}; }
            .client-section { margin-bottom: 24px; padding: 16px; background: #f8f8f8; border-radius: 6px; }
            .client-section .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .client-name { font-size: 15px; font-weight: 700; color: #111; }
            .client-sub { font-size: 11px; color: #555; margin-top: 2px; }
            .obs-section { margin-bottom: 20px; font-size: 11px; color: #555; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            thead th { background: ${primary}; color: #fff; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; }
            thead th:last-child { text-align: right; }
            tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
            tbody td:last-child { text-align: right; }
            tbody tr:nth-child(even) { background: #fafafa; }
            .extra-badge { background: #fef3c7; color: #92400e; border-radius: 3px; padding: 1px 5px; font-size: 9px; font-weight: 600; margin-left: 6px; }
            .included-badge { background: #d1fae5; color: #065f46; border-radius: 3px; padding: 1px 5px; font-size: 9px; font-weight: 600; margin-left: 6px; }
            .total-row td { border-top: 2px solid #ccc; font-weight: 700; font-size: 12px; padding-top: 10px; }
            .grand-total { background: ${primary}; color: #fff; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
            .grand-total .label { font-size: 14px; font-weight: 600; }
            .grand-total .value { font-size: 22px; font-weight: 800; }
            .footer { margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 10px; color: #888; text-align: center; }
            .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #444; margin-bottom: 8px; margin-top: 4px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="space-y-4">
      {/* Print button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Fatura content */}
      <div
        ref={printRef}
        className="fatura bg-white text-gray-900 p-10 text-sm"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div
          className="header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '32px',
            borderBottom: `2px solid ${primary}`,
            paddingBottom: '20px',
          }}
        >
          <div>
            {issuer.logoUrl && (
              <img src={issuer.logoUrl} alt={issuer.name} style={{ height: '40px', marginBottom: '8px', objectFit: 'contain' }} />
            )}
            <div style={{ fontSize: '20px', fontWeight: 800, color: primary }}>{issuer.name}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '4px', lineHeight: 1.6 }}>
              {issuer.cnpj && <div>CNPJ: {issuer.cnpj}</div>}
              {issuer.email && <div>{issuer.email}</div>}
              {issuer.phone && <div>{issuer.phone}</div>}
              {issuer.website && <div>{issuer.website}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referência</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: primary, marginBottom: '8px' }}>
              {refMonth.charAt(0).toUpperCase() + refMonth.slice(1)}
            </div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nº Fatura</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{invNumber}</div>
            <div style={{ fontSize: '10px', color: '#888', marginTop: '8px' }}>Emissão: {fmtDate(now.toISOString())}</div>
            {license.expires_at && (
              <div style={{ fontSize: '10px', color: '#888' }}>Venc.: {fmtDate(license.expires_at)}</div>
            )}
          </div>
        </div>

        {/* Client */}
        <div style={{ marginBottom: '20px', padding: '16px', background: '#f8f8f8', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Cliente</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{client.name}</div>
          {client.email && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{client.email}</div>}
          {client.cnpj && <div style={{ fontSize: '11px', color: '#555' }}>CNPJ: {client.cnpj}</div>}
          {license.plan && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#555' }}>
              Plano: <strong>{license.plan}</strong>
              {license.starts_at && ` · Ativo desde ${fmtDate(license.starts_at)}`}
            </div>
          )}
        </div>

        {/* Observations */}
        {observations && (
          <div style={{ marginBottom: '20px', fontSize: '11px', color: '#555', fontStyle: 'italic' }}>
            <strong style={{ fontStyle: 'normal', color: '#333' }}>Obs.:</strong> {observations}
          </div>
        )}

        {/* Attendants */}
        <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#444' }}>
          Atendentes
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: primary, color: '#fff' }}>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>N°</th>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>Nome</th>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>E-mail</th>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>Último Login</th>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>Criado em</th>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', fontWeight: 600 }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {attendantRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '16px 10px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                  Nenhum atendente vinculado
                </td>
              </tr>
            ) : (
              attendantRows.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '7px 10px', fontSize: '11px', color: '#888' }}>{i + 1}</td>
                  <td style={{ padding: '7px 10px', fontSize: '11px' }}>
                    {a.full_name || '—'}
                    {a.isExtra
                      ? <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '3px', padding: '1px 5px', fontSize: '9px', fontWeight: 600, marginLeft: '6px' }}>EXTRA</span>
                      : <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: '3px', padding: '1px 5px', fontSize: '9px', fontWeight: 600, marginLeft: '6px' }}>INCLUSO</span>
                    }
                  </td>
                  <td style={{ padding: '7px 10px', fontSize: '11px', color: '#555' }}>{a.email || '—'}</td>
                  <td style={{ padding: '7px 10px', fontSize: '11px', color: '#555' }}>{fmtDateTime(a.last_login_at)}</td>
                  <td style={{ padding: '7px 10px', fontSize: '11px', color: '#555' }}>{fmtDate(a.created_at)}</td>
                  <td style={{ padding: '7px 10px', fontSize: '11px', textAlign: 'right', fontWeight: a.isExtra ? 600 : 400, color: a.isExtra ? '#92400e' : '#888' }}>
                    {a.extraCost > 0 ? `R$ ${fmt(a.extraCost)}` : '—'}
                  </td>
                </tr>
              ))
            )}
            <tr style={{ borderTop: '2px solid #ccc', fontWeight: 700 }}>
              <td colSpan={5} style={{ padding: '10px 10px', fontSize: '12px', color: '#333' }}>
                Subtotal atendentes ({totalAtt} total · {license.extra_attendants} extras × R$ {fmt(attUnitPrice)})
              </td>
              <td style={{ padding: '10px 10px', fontSize: '12px', textAlign: 'right' }}>
                R$ {fmt(totalAttCost)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Devices */}
        <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#444' }}>
          Dispositivos
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: primary, color: '#fff' }}>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>N°</th>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>Dispositivo</th>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>Plataforma</th>
              <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', fontWeight: 600 }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {deviceRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '16px 10px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                  Nenhum dispositivo contratado
                </td>
              </tr>
            ) : (
              deviceRows.map((d, i) => (
                <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '7px 10px', fontSize: '11px', color: '#888' }}>{i + 1}</td>
                  <td style={{ padding: '7px 10px', fontSize: '11px' }}>
                    {d.label}
                    {d.isExtra
                      ? <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '3px', padding: '1px 5px', fontSize: '9px', fontWeight: 600, marginLeft: '6px' }}>EXTRA</span>
                      : <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: '3px', padding: '1px 5px', fontSize: '9px', fontWeight: 600, marginLeft: '6px' }}>INCLUSO</span>
                    }
                  </td>
                  <td style={{ padding: '7px 10px', fontSize: '11px', color: '#555' }}>{d.platform}</td>
                  <td style={{ padding: '7px 10px', fontSize: '11px', textAlign: 'right', fontWeight: d.isExtra ? 600 : 400, color: d.isExtra ? '#92400e' : '#888' }}>
                    {d.extraCost > 0 ? `R$ ${fmt(d.extraCost)}` : '—'}
                  </td>
                </tr>
              ))
            )}
            <tr style={{ borderTop: '2px solid #ccc', fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: '10px 10px', fontSize: '12px', color: '#333' }}>
                Subtotal dispositivos
              </td>
              <td style={{ padding: '10px 10px', fontSize: '12px', textAlign: 'right' }}>
                R$ {fmt(totalDevCost)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Additionals */}
        {license.has_ai_module && (
          <>
            <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#444' }}>
              Adicionais
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr style={{ background: primary, color: '#fff' }}>
                  <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>Item</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', fontWeight: 600 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '7px 10px', fontSize: '11px' }}>Módulo de Inteligência Artificial</td>
                  <td style={{ padding: '7px 10px', fontSize: '11px', textAlign: 'right', fontWeight: 600, color: '#6d28d9' }}>R$ {fmt(aiValue)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #ccc', fontWeight: 700 }}>
                  <td style={{ padding: '10px 10px', fontSize: '12px', color: '#333' }}>Subtotal adicionais</td>
                  <td style={{ padding: '10px 10px', fontSize: '12px', textAlign: 'right' }}>R$ {fmt(additionalsCost)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Grand Total */}
        <div style={{ background: primary, color: '#fff', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Total Mensal</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>R$ {fmt(grandTotal)}</div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', borderTop: '1px solid #ddd', paddingTop: '12px', fontSize: '10px', color: '#888', textAlign: 'center', lineHeight: 1.6 }}>
          {issuer.name}{issuer.cnpj ? ` · CNPJ ${issuer.cnpj}` : ''}{issuer.email ? ` · ${issuer.email}` : ''}
          <br />
          Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
}
