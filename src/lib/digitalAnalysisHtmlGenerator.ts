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
  if (score >= 7.5) return "#11bc76";
  if (score >= 5) return "#fbbf24";
  return "#f87171";
}

function scoreGradient(score: number | null): string {
  if (score === null) return "linear-gradient(135deg, #374151, #4b5563)";
  if (score >= 7.5) return "linear-gradient(135deg, #11bc76, #39f7b2)";
  if (score >= 5) return "linear-gradient(135deg, #f59e0b, #fbbf24)";
  return "linear-gradient(135deg, #ef4444, #f87171)";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "N/A";
  return score.toFixed(1);
}

function buildDetailsHtml(details: Record<string, any>, channel: string): string {
  const channelDetails = details[channel];
  if (!channelDetails) return "<p class='no-data'>Sem dados detalhados</p>";

  let html = "";
  if (channelDetails.checks && Array.isArray(channelDetails.checks)) {
    html += "<ul class='checks-list'>";
    for (const check of channelDetails.checks) {
      const icon = check.passed ? "✅" : "❌";
      html += `<li>${icon} ${check.label}</li>`;
    }
    html += "</ul>";
  }
  if (channelDetails.recommendation) {
    html += `<div class="rec-tip">💡 ${channelDetails.recommendation}</div>`;
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

  if (channels.length === 0) return "<p class='no-data'>Nenhum dado disponível para plano de ação.</p>";

  let html = "<div class='action-list'>";
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const color = scoreColor(ch.score);
    const priority = ch.score !== null && ch.score < 5 ? "🔴 Alta" : ch.score !== null && ch.score < 7 ? "🟡 Média" : "🟢 Baixa";
    const details = data.details_json[ch.name.toLowerCase().replace(/ /g, "_")];
    const rec = details?.recommendation || "Realizar análise detalhada para este canal.";
    html += `<div class="action-item" style="--delay:${i * 0.08}s">
      <div class="action-rank">${i + 1}</div>
      <div class="action-body">
        <div class="action-header">
          <strong style="color:${color}">${ch.name}</strong>
          <span class="action-score" style="background:${color}20;color:${color}">${scoreLabel(ch.score)}</span>
          <span class="action-priority">${priority}</span>
        </div>
        <p class="action-rec">${rec}</p>
      </div>
    </div>`;
  }
  html += "</div>";
  return html;
}

export function generateAnalysisHtml(data: DigitalAnalysisData): string {
  const date = new Date(data.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const goalScore = 7.5;
  const overallPct = Math.min((data.overall_score / 10) * 100, 100);

  const channels = [
    { key: "website", label: "Website", score: data.score_website, weight: "25%", icon: "🌐" },
    { key: "instagram", label: "Instagram", score: data.score_instagram, weight: "20%", icon: "📸" },
    { key: "google_business", label: "Perfil Empresa", score: data.score_google_business, weight: "20%", icon: "📍" },
    { key: "meta", label: "Meta", score: data.score_meta, weight: "15%", icon: "🛡️" },
    { key: "whatsapp", label: "WhatsApp", score: data.score_whatsapp, weight: "10%", icon: "💬" },
    { key: "neuro", label: "Neuro", score: data.score_neuro, weight: "10%", icon: "🧠" },
  ];

  // SVG ring gauge
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPct / 100) * circumference;
  const ringColor = scoreColor(data.overall_score);

  const channelCards = channels.map((ch) => {
    const score = ch.score;
    const pct = score !== null ? Math.min((score / 10) * 100, 100) : 0;
    const color = scoreColor(score);
    const gradient = scoreGradient(score);
    const isNA = score === null;
    const detailsHtml = buildDetailsHtml(data.details_json, ch.key);

    return `
    <div class="channel-card" onclick="this.classList.toggle('expanded')">
      <div class="channel-card-header">
        <span class="channel-icon">${ch.icon}</span>
        <div class="channel-meta">
          <span class="channel-name">${ch.label}</span>
          <span class="channel-weight">${ch.weight}</span>
        </div>
        <div class="channel-score-badge" style="background:${color}15;color:${color};border:1px solid ${color}30">
          ${isNA ? "—" : score!.toFixed(1)}
        </div>
      </div>
      <div class="channel-bar-wrap">
        <div class="channel-bar-bg">
          <div class="channel-bar-fill" style="width:${pct}%;background:${gradient}"></div>
          <div class="channel-goal" style="left:${(goalScore / 10) * 100}%"></div>
        </div>
      </div>
      <div class="channel-expand-area">${detailsHtml}</div>
      <div class="expand-hint">Clique para detalhes ▾</div>
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Relatório Digital — ${data.company_name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*{margin:0;padding:0;box-sizing:border-box}

:root{
  --bg:#191d20;
  --surface:#1e2529;
  --surface-2:#2a3038;
  --border:#2a3038;
  --text:#ebefef;
  --text-dim:#94a3b8;
  --text-muted:#64748b;
  --emerald:#11bc76;
  --aqua:#39f7b2;
  --amber:#fbbf24;
  --rose:#f87171;
  --blue:#4f5ae3;
  --purple:#a78bfa;
}

body{
  background:var(--bg);
  color:var(--text);
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  line-height:1.6;
  min-height:100vh;
  overflow-x:hidden;
}

/* Ambient background */
body::before{
  content:'';position:fixed;top:0;left:0;right:0;bottom:0;
  background:radial-gradient(ellipse 80% 60% at 50% -20%,rgba(17,188,118,0.08),transparent),
              radial-gradient(ellipse 60% 40% at 80% 80%,rgba(79,90,227,0.05),transparent);
  pointer-events:none;z-index:0;
}

.container{max-width:880px;margin:0 auto;padding:32px 20px;position:relative;z-index:1}

/* ===== HEADER ===== */
.header{
  display:flex;align-items:center;gap:32px;
  padding:40px;margin-bottom:32px;
  background:linear-gradient(135deg,var(--surface) 0%,rgba(31,41,55,0.6) 100%);
  border-radius:24px;
  border:1px solid var(--border);
  backdrop-filter:blur(20px);
  position:relative;overflow:hidden;
}
.header::after{
  content:'';position:absolute;top:0;right:0;width:200px;height:200px;
  background:radial-gradient(circle,${ringColor}10,transparent 70%);
  pointer-events:none;
}
.gauge-wrap{flex-shrink:0;position:relative;width:130px;height:130px}
.gauge-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.gauge-score{font-size:32px;font-weight:900;letter-spacing:-1px;color:${ringColor}}
.gauge-max{font-size:11px;color:var(--text-muted);font-weight:500}
.header-info{flex:1;min-width:0}
.company-name{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:2px}
.category{font-size:13px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;font-weight:500}
.overall-label{font-size:18px;font-weight:700;color:${ringColor};margin-bottom:8px}
.date-badge{
  display:inline-flex;align-items:center;gap:6px;
  font-size:12px;color:var(--text-muted);
  background:var(--surface-2);padding:6px 14px;border-radius:99px;
  border:1px solid var(--border);
}

/* ===== OVERALL BAR ===== */
.overall-bar-section{margin-bottom:28px;padding:0 4px}
.overall-bar-bg{height:10px;border-radius:99px;background:var(--surface);overflow:hidden;position:relative;border:1px solid var(--border)}
.overall-bar-fill{height:100%;border-radius:99px;background:${scoreGradient(data.overall_score)};transition:width 1s cubic-bezier(.4,0,.2,1)}
.overall-goal{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--text-dim);border-radius:2px;opacity:.4}
.bar-legend{display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--text-muted);position:relative;font-variant-numeric:tabular-nums}
.bar-legend .goal-label{position:absolute;transform:translateX(-50%);color:var(--text-dim);font-weight:600}

/* ===== CHANNEL CARDS ===== */
.channels-section{margin-bottom:28px}
.channels-section h3{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--text-muted);font-weight:700;margin-bottom:16px;padding-left:4px}
.channels-grid{display:grid;gap:10px}

.channel-card{
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:16px;
  padding:16px 20px;
  cursor:pointer;
  transition:all .3s cubic-bezier(.4,0,.2,1);
  position:relative;overflow:hidden;
}
.channel-card::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,transparent 60%,rgba(255,255,255,.02) 100%);
  pointer-events:none;
}
.channel-card:hover{
  border-color:rgba(255,255,255,.08);
  transform:translateY(-1px);
  box-shadow:0 8px 32px rgba(0,0,0,.3);
}
.channel-card-header{display:flex;align-items:center;gap:12px}
.channel-icon{font-size:20px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--surface-2);border-radius:10px;border:1px solid var(--border)}
.channel-meta{flex:1;min-width:0}
.channel-name{font-size:14px;font-weight:600;color:var(--text);display:block}
.channel-weight{font-size:10px;color:var(--text-muted);font-variant-numeric:tabular-nums}
.channel-score-badge{
  font-size:15px;font-weight:800;
  padding:4px 12px;border-radius:10px;
  font-variant-numeric:tabular-nums;
  letter-spacing:-0.5px;
}
.channel-bar-wrap{margin:12px 0 4px;position:relative}
.channel-bar-bg{height:6px;border-radius:99px;background:var(--surface-2);overflow:hidden;position:relative}
.channel-bar-fill{height:100%;border-radius:99px;transition:width .8s cubic-bezier(.4,0,.2,1)}
.channel-goal{position:absolute;top:-1px;bottom:-1px;width:1px;background:var(--text-muted);opacity:.3}
.expand-hint{font-size:10px;color:var(--text-muted);text-align:center;margin-top:6px;opacity:.5;transition:opacity .2s}
.channel-card:hover .expand-hint{opacity:.8}

/* Expanded state */
.channel-expand-area{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1)}
.channel-card.expanded .channel-expand-area{max-height:400px}
.channel-card.expanded .expand-hint{display:none}
.checks-list{list-style:none;padding:12px 0 0;margin:0}
.checks-list li{font-size:13px;color:var(--text-dim);margin:6px 0;padding:6px 10px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border)}
.rec-tip{font-size:12px;color:var(--text-muted);margin-top:10px;padding:10px 12px;border-left:3px solid var(--amber);background:rgba(251,191,36,.03);border-radius:0 8px 8px 0}
.no-data{color:var(--text-muted);font-size:13px;padding:8px 0}

/* ===== INFO SECTION ===== */
.info-section{
  background:var(--surface);border-radius:20px;
  padding:28px;border:1px solid var(--border);
  margin-bottom:28px;
}
.info-section h3{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--text-muted);font-weight:700;margin-bottom:18px}
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.info-item{
  padding:14px 16px;
  background:var(--surface-2);border-radius:12px;
  border:1px solid var(--border);
}
.info-item span{display:block;font-size:10px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;font-weight:600}
.info-item p,.info-item a{font-size:14px;color:var(--text);font-weight:500}
.info-item a{color:var(--blue);text-decoration:none}
.info-item a:hover{text-decoration:underline}

/* ===== ACTION PLAN ===== */
.action-btn{
  width:100%;padding:18px 24px;
  background:linear-gradient(135deg,var(--surface) 0%,var(--surface-2) 100%);
  border:1px solid var(--border);border-radius:16px;
  color:var(--text);font-size:15px;font-weight:700;
  cursor:pointer;text-align:left;
  display:flex;align-items:center;gap:10px;
  transition:all .2s;margin-bottom:0;
}
.action-btn:hover{border-color:rgba(255,255,255,.1);box-shadow:0 4px 20px rgba(0,0,0,.3)}
.action-btn .arrow{transition:transform .3s;font-size:12px;margin-left:auto}
.action-content{
  max-height:0;overflow:hidden;
  transition:max-height .5s cubic-bezier(.4,0,.2,1);
  margin-bottom:28px;
}
.action-content.open{max-height:2000px}
.action-content.open+.spacer{display:none}
.action-list{padding:20px 0}
.action-item{
  display:flex;gap:14px;
  padding:16px;margin-bottom:10px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:14px;
  transition:transform .2s;
  animation:fadeSlideIn .4s ease forwards;
  animation-delay:var(--delay,0s);
  opacity:0;
}
.action-content.open .action-item{opacity:1}
.action-item:hover{transform:translateX(4px)}
.action-rank{
  width:32px;height:32px;
  display:flex;align-items:center;justify-content:center;
  background:var(--surface-2);border-radius:10px;
  font-size:14px;font-weight:800;color:var(--text-muted);
  border:1px solid var(--border);flex-shrink:0;
}
.action-body{flex:1;min-width:0}
.action-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.action-header strong{font-size:14px}
.action-score{font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px}
.action-priority{font-size:11px;color:var(--text-muted)}
.action-rec{font-size:13px;color:var(--text-dim);line-height:1.5}

@keyframes fadeSlideIn{
  from{opacity:0;transform:translateY(8px)}
  to{opacity:1;transform:translateY(0)}
}

/* ===== FOOTER ===== */
.footer{
  text-align:center;padding:28px 20px;
  color:var(--text-muted);font-size:12px;
  border-top:1px solid var(--border);margin-top:20px;
  letter-spacing:.5px;
}

/* ===== MOBILE ===== */
@media(max-width:640px){
  body{font-size:14px}
  .container{padding:16px 12px}
  .header{flex-direction:column;align-items:center;text-align:center;padding:28px 20px;gap:20px}
  .gauge-wrap{width:110px;height:110px}
  .gauge-score{font-size:28px}
  .company-name{font-size:22px}
  .overall-label{font-size:16px}
  .info-grid{grid-template-columns:1fr}
}

/* ===== PRINT ===== */
@media print{
  body{background:#fff;color:#111}
  .channel-card,.info-section,.header{border-color:#e5e7eb;background:#fff}
  .channel-expand-area{max-height:none!important}
  .action-content{max-height:none!important}
  .expand-hint,.action-btn{display:none}
}
</style>
</head>
<body>
<div class="container">

  <!-- HEADER -->
  <div class="header">
    <div class="gauge-wrap">
      <svg width="130" height="130" viewBox="0 0 120 120" style="transform:rotate(-90deg)">
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="8"/>
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
          style="transition:stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)"/>
      </svg>
      <div class="gauge-center">
        <span class="gauge-score">${data.overall_score.toFixed(1)}</span>
        <span class="gauge-max">/10</span>
      </div>
    </div>
    <div class="header-info">
      <div class="company-name">${data.company_name}</div>
      ${data.category ? `<div class="category">${data.category}</div>` : ""}
      <div class="overall-label">${data.overall_label || ""}</div>
      <div class="date-badge">📅 ${date}</div>
    </div>
  </div>

  <!-- OVERALL BAR -->
  <div class="overall-bar-section">
    <div class="overall-bar-bg">
      <div class="overall-bar-fill" style="width:${overallPct}%"></div>
      <div class="overall-goal" style="left:${(goalScore / 10) * 100}%"></div>
    </div>
    <div class="bar-legend">
      <span>0</span>
      <span class="goal-label" style="left:${(goalScore / 10) * 100}%">Meta ${goalScore}</span>
      <span>10</span>
    </div>
  </div>

  <!-- CHANNEL CARDS -->
  <div class="channels-section">
    <h3>Scores por Canal</h3>
    <div class="channels-grid">
      ${channelCards}
    </div>
  </div>

  <!-- RESUMO DA EMPRESA -->
  <div class="info-section">
    <h3>Resumo da Empresa</h3>
    <div class="info-grid">
      ${data.address ? `<div class="info-item"><span>Endereço</span><p>${data.address}</p></div>` : ""}
      ${data.phone ? `<div class="info-item"><span>Telefone</span><p>${data.phone}</p></div>` : ""}
      ${data.website_url ? `<div class="info-item"><span>Website</span><a href="${data.website_url}">${data.website_url}</a></div>` : ""}
      ${data.total_reviews !== null ? `<div class="info-item"><span>Avaliações</span><p>${data.total_reviews} avaliações${data.avg_rating !== null ? ` • ${data.avg_rating.toFixed(1)}★` : ""}</p></div>` : ""}
      ${!data.address && !data.phone && !data.website_url && data.total_reviews === null ? `<div class="info-item"><span>Info</span><p style="color:var(--text-muted)">Nenhuma informação disponível</p></div>` : ""}
    </div>
  </div>

  <!-- PLANO DE AÇÃO -->
  <button class="action-btn" onclick="var c=document.getElementById('action-content');c.classList.toggle('open');this.querySelector('.arrow').style.transform=c.classList.contains('open')?'rotate(180deg)':''">
    📋 Ver Plano de Ação <span class="arrow">▼</span>
  </button>
  <div id="action-content" class="action-content">
    ${buildActionPlan(data)}
  </div>

  <!-- FOOTER -->
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
