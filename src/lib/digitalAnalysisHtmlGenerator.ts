export interface DigitalAnalysisData {
  id: string;
  created_at: string;
  company_name: string;
  category: string | null;
  overall_score: number;
  overall_label: string | null;
  score_website: number | null;
  score_instagram: number | null;
  score_google_business: number | null;
  score_meta: number | null;
  score_whatsapp: number | null;
  score_neuro: number | null;
  details_json: Record<string, any>;
  address: string | null;
  phone: string | null;
  website_url: string | null;
  total_reviews: number | null;
  avg_rating: number | null;
}

function scoreColor(score: number | null): string {
  if (score === null) return "#6b7280";
  if (score >= 7.5) return "#22c55e";
  if (score >= 6) return "#eab308";
  return "#ef4444";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "N/A";
  return score.toFixed(1);
}

function buildDetailsHtml(details: Record<string, any>, channel: string): string {
  const channelDetails = details[channel];
  if (!channelDetails) return "<p style='color:#9ca3af;font-size:13px;'>Sem dados detalhados</p>";

  let html = "";
  if (channelDetails.checks && Array.isArray(channelDetails.checks)) {
    html += "<ul style='list-style:none;padding:0;margin:8px 0;'>";
    for (const check of channelDetails.checks) {
      const icon = check.passed ? "✅" : "❌";
      html += `<li style="font-size:13px;color:#d1d5db;margin:4px 0;">${icon} ${check.label}</li>`;
    }
    html += "</ul>";
  }
  if (channelDetails.recommendation) {
    html += `<p style="font-size:12px;color:#9ca3af;margin-top:8px;border-top:1px solid #2d3142;padding-top:8px;">💡 ${channelDetails.recommendation}</p>`;
  }
  return html;
}

function buildActionPlan(data: DigitalAnalysisData): string {
  const channels = [
    { name: "Website", score: data.score_website },
    { name: "Instagram", score: data.score_instagram },
    { name: "Perfil Empresa", score: data.score_google_business },
    { name: "Meta", score: data.score_meta },
    { name: "WhatsApp", score: data.score_whatsapp },
    { name: "Neuromarketing", score: data.score_neuro },
  ]
    .filter((c) => c.score !== null)
    .sort((a, b) => (a.score ?? 10) - (b.score ?? 10));

  if (channels.length === 0) return "<p style='color:#9ca3af;'>Nenhum dado disponível para plano de ação.</p>";

  let html = "<ol style='padding-left:20px;'>";
  for (const ch of channels) {
    const color = scoreColor(ch.score);
    const priority = ch.score !== null && ch.score < 5 ? "🔴 Alta" : ch.score !== null && ch.score < 7 ? "🟡 Média" : "🟢 Baixa";
    const details = data.details_json[ch.name.toLowerCase().replace(/ /g, "_")];
    const rec = details?.recommendation || "Realizar análise detalhada para este canal.";
    html += `<li style="margin:12px 0;color:#d1d5db;">
      <strong style="color:${color}">${ch.name}</strong> — Score: ${scoreLabel(ch.score)} | Prioridade: ${priority}
      <br/><span style="font-size:13px;color:#9ca3af;">${rec}</span>
    </li>`;
  }
  html += "</ol>";
  return html;
}

export function generateAnalysisHtml(data: DigitalAnalysisData): string {
  const date = new Date(data.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const channels = [
    { key: "website", label: "Website", score: data.score_website },
    { key: "instagram", label: "Instagram", score: data.score_instagram },
    { key: "google_business", label: "Perfil Empresa", score: data.score_google_business },
    { key: "meta", label: "Meta", score: data.score_meta },
    { key: "whatsapp", label: "WhatsApp", score: data.score_whatsapp },
    { key: "neuro", label: "Neuro", score: data.score_neuro },
  ];

  const scoreCards = channels
    .map(
      (ch) => `
    <div class="score-card" onmouseenter="this.querySelector('.details').style.maxHeight='300px';this.querySelector('.details').style.opacity='1';" onmouseleave="this.querySelector('.details').style.maxHeight='0';this.querySelector('.details').style.opacity='0';">
      <div class="score-header">
        <span class="channel-name">${ch.label}</span>
        <span class="channel-score" style="color:${scoreColor(ch.score)}">${scoreLabel(ch.score)}</span>
      </div>
      <div class="details" style="max-height:0;opacity:0;overflow:hidden;transition:all .3s ease;">
        ${buildDetailsHtml(data.details_json, ch.key)}
      </div>
    </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Relatório - ${data.company_name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f1117;color:#e5e7eb;font-family:system-ui,-apple-system,sans-serif;padding:24px;min-height:100vh}
.container{max-width:900px;margin:0 auto}
.header{text-align:center;margin-bottom:32px;padding:32px;background:#1a1d27;border-radius:16px;border:1px solid #2d3142}
.company-name{font-size:28px;font-weight:700;color:#fff;margin-bottom:4px}
.category{font-size:14px;color:#9ca3af;margin-bottom:16px}
.overall-score{font-size:56px;font-weight:800;margin:16px 0 8px}
.overall-label{font-size:16px;font-weight:500;margin-bottom:8px}
.date{font-size:13px;color:#6b7280}
.scores-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:32px}
.score-card{background:#1a1d27;border-radius:12px;padding:16px;border:1px solid #2d3142;cursor:pointer;transition:border-color .2s}
.score-card:hover{border-color:#4f46e5}
.score-header{display:flex;flex-direction:column;align-items:center;gap:8px}
.channel-name{font-size:13px;color:#9ca3af;font-weight:500}
.channel-score{font-size:24px;font-weight:700}
.info-section{background:#1a1d27;border-radius:12px;padding:24px;border:1px solid #2d3142;margin-bottom:24px}
.info-section h3{font-size:16px;font-weight:600;color:#fff;margin-bottom:16px}
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.info-item{font-size:14px;color:#d1d5db}
.info-item span{display:block;font-size:12px;color:#6b7280;margin-bottom:2px}
.action-btn{background:#1a1d27;border:1px solid #2d3142;border-radius:12px;padding:16px 24px;color:#d1d5db;font-size:15px;font-weight:600;cursor:pointer;width:100%;text-align:left;margin-bottom:24px;transition:border-color .2s}
.action-btn:hover{border-color:#4f46e5}
.action-content{background:#1a1d27;border-radius:0 0 12px 12px;padding:0 24px;max-height:0;overflow:hidden;transition:all .3s ease;border:1px solid transparent}
.action-content.open{max-height:2000px;padding:24px;border-color:#2d3142;margin-top:-25px;margin-bottom:24px}
.footer{text-align:center;padding:24px;color:#6b7280;font-size:12px;border-top:1px solid #2d3142;margin-top:32px}
@media(max-width:640px){
  .scores-grid{grid-template-columns:repeat(2,1fr)}
  .overall-score{font-size:40px}
  body{padding:12px}
}
</style>
</head>
<body>
<div class="container">

  <!-- SEÇÃO 1: Header -->
  <div class="header">
    <div class="company-name">${data.company_name}</div>
    ${data.category ? `<div class="category">${data.category}</div>` : ""}
    <div class="overall-score" style="color:${scoreColor(data.overall_score)}">${data.overall_score.toFixed(1)}<span style="font-size:24px;color:#6b7280">/10</span></div>
    <div class="overall-label" style="color:${scoreColor(data.overall_score)}">${data.overall_label || ""}</div>
    <div class="date">Análise realizada em ${date}</div>
  </div>

  <!-- SEÇÃO 2: Score Cards -->
  <div class="scores-grid">
    ${scoreCards}
  </div>

  <!-- SEÇÃO 3: Resumo da Empresa -->
  <div class="info-section">
    <h3>Resumo da Empresa</h3>
    <div class="info-grid">
      ${data.address ? `<div class="info-item"><span>Endereço</span>${data.address}</div>` : ""}
      ${data.phone ? `<div class="info-item"><span>Telefone</span>${data.phone}</div>` : ""}
      ${data.website_url ? `<div class="info-item"><span>Website</span><a href="${data.website_url}" style="color:#818cf8">${data.website_url}</a></div>` : ""}
      ${data.total_reviews !== null ? `<div class="info-item"><span>Avaliações</span>${data.total_reviews} avaliações${data.avg_rating !== null ? ` • ${data.avg_rating.toFixed(1)}★` : ""}</div>` : ""}
      ${!data.address && !data.phone && !data.website_url && data.total_reviews === null ? `<div class="info-item" style="color:#6b7280">Nenhuma informação disponível</div>` : ""}
    </div>
  </div>

  <!-- SEÇÃO 4: Plano de Ação -->
  <button class="action-btn" onclick="var c=document.getElementById('action-content');c.classList.toggle('open');">
    📋 Ver Plano de Ação
  </button>
  <div id="action-content" class="action-content">
    <h3 style="color:#fff;margin-bottom:16px;font-size:16px;">Plano de Ação Priorizado</h3>
    ${buildActionPlan(data)}
  </div>

  <!-- Footer -->
  <div class="footer">
    Gerado por WhatsFlow Digital Intelligence • ${date}
  </div>

</div>
</body>
</html>`;
}

export function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateFilename(companyName: string): string {
  const slug = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = new Date().toISOString().split("T")[0];
  return `relatorio-${slug}-${date}.html`;
}
