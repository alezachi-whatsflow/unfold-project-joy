interface QuickReportData {
  leadName: string;
  leadUrl: string | null;
  leadPhone: string | null;
  leadDescription: string | null;
  score: number;
  niche: string;
  city: string;
  hasSite: boolean;
  hasPhone: boolean;
}

function scoreColor(score: number): string {
  if (score >= 8) return "#11bc76";
  if (score >= 5) return "#fbbf24";
  return "#f87171";
}

function scoreLabel(score: number): string {
  if (score >= 8) return "Oportunidade Quente 🔥";
  if (score >= 5) return "Potencial Médio";
  return "Baixa Prioridade";
}

function getRecommendations(data: QuickReportData): string[] {
  const recs: string[] = [];
  if (!data.hasSite) recs.push("A empresa não possui site ou tem presença digital muito fraca — oportunidade para criação de website profissional.");
  if (data.hasSite && data.score <= 5) recs.push("O site existe mas possui conteúdo fraco ou pouca otimização — oportunidade para redesign ou otimização SEO.");
  if (!data.hasPhone) recs.push("Não há telefone/WhatsApp visível no site — oportunidade para implementar botão de contato direto.");
  recs.push("Recomendamos uma análise completa de presença digital (Website, Instagram, Google Meu Negócio e Meta) para identificar todas as oportunidades.");
  recs.push("Um plano de ação personalizado pode ser elaborado após a análise completa.");
  return recs;
}

export function generateQuickReportHtml(data: QuickReportData): string {
  const color = scoreColor(data.score);
  const label = scoreLabel(data.score);
  const recs = getRecommendations(data);
  const date = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Digital — ${data.leadName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px 20px; }
    .container { max-width: 700px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid #262626; }
    .header h1 { font-size: 20px; font-weight: 700; color: #00C896; margin-bottom: 4px; letter-spacing: -0.5px; }
    .header p { font-size: 12px; color: #737373; }
    .company-card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 28px; margin-bottom: 24px; }
    .company-name { font-size: 22px; font-weight: 700; color: #fafafa; margin-bottom: 8px; }
    .company-meta { font-size: 13px; color: #a3a3a3; margin-bottom: 4px; }
    .score-section { display: flex; align-items: center; gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #262626; }
    .score-circle { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #0a0a0a; }
    .score-info h3 { font-size: 16px; font-weight: 600; color: #fafafa; }
    .score-info p { font-size: 12px; color: #a3a3a3; margin-top: 2px; }
    .section { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .section h2 { font-size: 14px; font-weight: 700; color: #00C896; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .check-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #1a1a1a; font-size: 14px; }
    .check-item:last-child { border-bottom: none; }
    .check-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .rec-item { padding: 12px 16px; background: #1a2332; border-left: 3px solid #00C896; border-radius: 0 8px 8px 0; margin-bottom: 10px; font-size: 13px; line-height: 1.5; color: #d4d4d4; }
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid #262626; margin-top: 32px; }
    .footer p { font-size: 11px; color: #525252; }
    .cta { display: inline-block; margin-top: 16px; padding: 12px 32px; background: #00C896; color: #0a0a0a; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Diagnóstico de Presença Digital</h1>
      <p>Gerado em ${date} · Powered by Digital Intelligence</p>
    </div>

    <div class="company-card">
      <div class="company-name">${data.leadName}</div>
      <div class="company-meta">📍 ${data.niche} · ${data.city}</div>
      ${data.leadUrl ? `<div class="company-meta">🌐 ${data.leadUrl}</div>` : ""}
      ${data.leadPhone ? `<div class="company-meta">📞 ${data.leadPhone}</div>` : ""}
      ${data.leadDescription ? `<div class="company-meta" style="margin-top:8px;color:#d4d4d4">${data.leadDescription}</div>` : ""}

      <div class="score-section">
        <div class="score-circle" style="background:${color}">${data.score}/10</div>
        <div class="score-info">
          <h3>${label}</h3>
          <p>Score de Oportunidade Digital</p>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Diagnóstico Rápido</h2>
      <div class="check-item">
        <span class="check-icon">${data.hasSite ? "✅" : "❌"}</span>
        <span>${data.hasSite ? "Possui website ativo" : "Não possui website ou site indisponível"}</span>
      </div>
      <div class="check-item">
        <span class="check-icon">${data.hasPhone ? "✅" : "❌"}</span>
        <span>${data.hasPhone ? "Telefone/WhatsApp visível no site" : "Sem telefone/WhatsApp visível no site"}</span>
      </div>
      <div class="check-item">
        <span class="check-icon">${data.score >= 5 ? "⚠️" : "❌"}</span>
        <span>Conteúdo digital ${data.score >= 7 ? "adequado" : data.score >= 4 ? "pode ser melhorado" : "precisa de atenção urgente"}</span>
      </div>
    </div>

    <div class="section">
      <h2>Recomendações</h2>
      ${recs.map(r => `<div class="rec-item">${r}</div>`).join("")}
    </div>

    <div class="footer">
      <p>Este relatório foi gerado automaticamente pela plataforma de Inteligência Digital.</p>
      <p style="margin-top:4px">Para uma análise completa e personalizada, entre em contato.</p>
    </div>
  </div>
</body>
</html>`;
}
