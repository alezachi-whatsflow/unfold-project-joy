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
  if (score === null) return "#4b5563";
  if (score >= 7.5) return "#11bc76";
  if (score >= 5) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "N/A";
  return score.toFixed(1);
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildDetailsHtml(details: Record<string, any>, channel: string): string {
  const channelDetails = details[channel];
  if (!channelDetails) return "<p class='no-data'>Sem dados detalhados</p>";

  let html = "";
  if (channelDetails.checks && Array.isArray(channelDetails.checks)) {
    html += "<ul class='checks-list'>";
    for (const check of channelDetails.checks) {
      const icon = check.passed ? "✅" : "❌";
      html += `<li>${icon} ${esc(check.label)}</li>`;
    }
    html += "</ul>";
  }
  if (channelDetails.recommendation) {
    html += `<div class="rec-tip">💡 ${esc(channelDetails.recommendation)}</div>`;
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
          <strong style="color:${color}">${esc(ch.name)}</strong>
          <span class="action-score" style="background:${color}20;color:${color}">${scoreLabel(ch.score)}</span>
          <span class="action-priority">${priority}</span>
        </div>
        <p class="action-rec">${esc(rec)}</p>
      </div>
    </div>`;
  }
  html += "</div>";
  return html;
}

function buildNeuroSection(data: DigitalAnalysisData): string {
  const neuro = data.details_json?.neuro_full;
  if (!neuro) return "";

  const scoreColor2 = (s: number) => s >= 7 ? "#11bc76" : s >= 5 ? "#fbbf24" : "#f87171";
  const pct = (s: number) => Math.min(Math.round((s / 10) * 100), 100);

  // ── Cérebros ──
  const brains = [
    { key: "cerebro_reptiliano", label: "Reptiliano", icon: "⚡", desc: "Instinto, sobrevivência, ação imediata", data: neuro.cerebro_reptiliano },
    { key: "cerebro_limbico",    label: "Límbico",    icon: "❤️", desc: "Emoções, memória, conexão",           data: neuro.cerebro_limbico },
    { key: "neocortex",          label: "Neocórtex",  icon: "💡", desc: "Lógica, racionalização, decisão",     data: neuro.neocortex },
  ];

  const brainCards = brains.map(b => {
    if (!b.data) return "";
    const c = scoreColor2(b.data.score ?? 0);
    const elementos = (b.data.elementos_analisados || []).map((el: any) => {
      const ok = el.status === "Detectado" || el.status === "Presente" || el.status === "Indicado";
      return `<div class="neuro-el ${ok ? 'ok' : 'gap'}">
        <div class="neuro-el-header">
          <span class="neuro-el-dot">${ok ? "✅" : "❌"}</span>
          <strong>${esc(el.elemento)}</strong>
          <span class="neuro-el-status">${esc(el.status)}</span>
        </div>
        <p class="neuro-el-achado">${esc(el.achado)}</p>
        <p class="neuro-el-rec">💡 ${esc(el.recomendacao)}</p>
      </div>`;
    }).join("");

    return `<div class="neuro-brain-card">
      <div class="neuro-brain-header">
        <span class="neuro-brain-icon">${b.icon}</span>
        <div class="neuro-brain-meta">
          <span class="neuro-brain-label">${b.label}</span>
          <span class="neuro-brain-desc">${b.desc}</span>
        </div>
        <span class="neuro-brain-score" style="color:${c}">${(b.data.score ?? 0).toFixed(1)}<small>/10</small></span>
      </div>
      <div class="neuro-bar-bg"><div class="neuro-bar-fill" style="width:${pct(b.data.score ?? 0)}%;background:${scoreGradient(b.data.score)}"></div></div>
      ${elementos ? `<div class="neuro-elementos">${elementos}</div>` : ""}
    </div>`;
  }).join("");

  // ── Cialdini ──
  const cialdiniMap: Record<string, string> = {
    reciprocidade: "Reciprocidade",
    prova_social: "Prova Social",
    autoridade: "Autoridade",
    escassez: "Escassez",
    urgencia: "Urgência",
    compromisso: "Compromisso",
  };
  const gatilhos = neuro.gatilhos_cialdini || {};
  const cialdiniCards = Object.entries(cialdiniMap).map(([key, label]) => {
    const g = gatilhos[key];
    if (!g) return "";
    return `<div class="cialdini-card ${g.presente ? 'presente' : 'ausente'}">
      <div class="cialdini-header">
        <span class="cialdini-dot">${g.presente ? "✅" : "❌"}</span>
        <strong>${label}</strong>
      </div>
      ${g.exemplo ? `<p class="cialdini-ex">${esc(g.exemplo)}</p>` : ""}
      ${g.sugestao ? `<p class="cialdini-sug">💡 ${esc(g.sugestao)}</p>` : ""}
    </div>`;
  }).join("");

  // ── Above the Fold ──
  const atf = neuro.above_the_fold;
  let atfHtml = "";
  if (atf) {
    const atfScore = scoreColor2(atf.score ?? 0);
    const items = [
      { label: "Proposta de valor clara", ok: atf.tem_proposta_valor_clara },
      { label: "CTA visível",             ok: atf.tem_cta_visivel },
      { label: "Imagem de pessoa",        ok: atf.tem_imagem_de_pessoa },
      { label: "Elemento de confiança",   ok: atf.tem_elemento_confianca },
    ];
    atfHtml = `<div class="neuro-module-card">
      <div class="neuro-module-header">
        <span>👁️ Above the Fold</span>
        <span class="neuro-module-score" style="color:${atfScore}">${(atf.score ?? 0).toFixed(1)}/10</span>
      </div>
      <div class="atf-checks">
        ${items.map(i => `<div class="atf-check ${i.ok ? 'ok' : 'gap'}">
          <span>${i.ok ? "✅" : "❌"}</span>
          <span>${i.label}</span>
        </div>`).join("")}
      </div>
      ${atf.tempo_compreensao_estimado ? `<p class="neuro-module-detail">⏱️ Tempo de compreensão: <strong>${esc(atf.tempo_compreensao_estimado)}</strong></p>` : ""}
    </div>`;
  }

  // ── Eye Tracking ──
  const et = neuro.eye_tracking_simulado;
  let etHtml = "";
  if (et) {
    etHtml = `<div class="neuro-module-card">
      <div class="neuro-module-header"><span>👁️ Eye Tracking Simulado</span></div>
      <div class="et-grid">
        <div class="et-item"><span>Padrão</span><strong>${esc(et.padrao_detectado)}</strong></div>
        <div class="et-item"><span>CTA na zona quente</span><strong>${et.cta_na_zona_quente ? "✅ Sim" : "❌ Não"}</strong></div>
        <div class="et-item"><span>WhatsApp na zona quente</span><strong>${et.whatsapp_na_zona_quente ? "✅ Sim" : "❌ Não"}</strong></div>
      </div>
      ${(et.recomendacoes_layout || []).length > 0 ? `<ul class="et-recs">${et.recomendacoes_layout.map((r: string) => `<li>💡 ${esc(r)}</li>`).join("")}</ul>` : ""}
    </div>`;
  }

  // ── Psicologia das Cores ──
  const cores = neuro.psicologia_das_cores;
  let coresHtml = "";
  if (cores) {
    const adequacaoColor = cores.adequacao_para_nicho === "Excelente" ? "#11bc76"
      : cores.adequacao_para_nicho === "Adequada" ? "#fbbf24"
      : cores.adequacao_para_nicho === "Neutra" ? "#94a3b8" : "#f87171";
    coresHtml = `<div class="neuro-module-card">
      <div class="neuro-module-header"><span>🎨 Psicologia das Cores</span></div>
      <div class="cores-grid">
        <div class="cores-item">
          <span>Cor predominante</span>
          <strong>${esc(cores.cor_predominante)}</strong>
        </div>
        <div class="cores-item">
          <span>Adequação ao nicho</span>
          <strong style="color:${adequacaoColor}">${esc(cores.adequacao_para_nicho)}</strong>
        </div>
        <div class="cores-item cores-full">
          <span>Emoção evocada</span>
          <strong>${esc(cores.emocao_evocada)}</strong>
        </div>
        ${cores.sugestao_cores ? `<div class="cores-item cores-full"><span>Sugestão</span><p>${esc(cores.sugestao_cores)}</p></div>` : ""}
      </div>
    </div>`;
  }

  // ── Top 5 Melhorias ──
  const top5 = neuro.top5_melhorias_neuromarketing || [];
  let top5Html = "";
  if (top5.length > 0) {
    top5Html = `<div class="top5-section">
      <h4 class="neuro-sub-title">🏆 Top 5 Melhorias de Neuromarketing</h4>
      <div class="top5-list">
        ${top5.map((item: any) => `
        <div class="top5-item">
          <div class="top5-rank">${item.posicao}</div>
          <div class="top5-body">
            <div class="top5-header">
              <strong>${esc(item.melhoria)}</strong>
              <span class="top5-tag">${esc(item.principio)}</span>
            </div>
            <p class="top5-impacto" style="color:#11bc76">${esc(item.impacto_conversao_estimado)}</p>
            <p class="top5-como">${esc(item.como_implementar)}</p>
            <div class="top5-badges">
              <span class="top5-badge dif-${(item.dificuldade || '').toLowerCase()}">${esc(item.dificuldade)}</span>
              <span class="top5-badge custo">${esc(item.custo)}</span>
            </div>
          </div>
        </div>`).join("")}
      </div>
    </div>`;
  }

  return `
  <!-- NEUROMARKETING -->
  <div class="neuro-section">
    <div class="neuro-section-header">
      <span class="neuro-section-icon">🧠</span>
      <div>
        <h3 class="neuro-section-title">Análise Neuromarketing</h3>
        <p class="neuro-section-sub">Análise baseada em neurociência aplicada ao design</p>
      </div>
      <div class="neuro-section-score">
        <span style="color:${scoreColor2(neuro.score_geral ?? 0)};font-size:28px;font-weight:900">${(neuro.score_geral ?? 0).toFixed(1)}</span>
        <span class="neuro-nivel" style="color:${scoreColor2(neuro.score_geral ?? 0)}">${esc(neuro.nivel)}</span>
      </div>
    </div>

    <h4 class="neuro-sub-title">Análise dos 3 Cérebros</h4>
    <div class="neuro-brains">${brainCards}</div>

    <h4 class="neuro-sub-title">Gatilhos de Cialdini</h4>
    <div class="cialdini-grid">${cialdiniCards}</div>

    <div class="neuro-modules-grid">
      ${atfHtml}
      ${etHtml}
      ${coresHtml}
    </div>

    ${top5Html}
  </div>`;
}

export function generateAnalysisHtml(data: DigitalAnalysisData): string {
  const date = fmtDate(data.created_at);

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

  const neuroSection = buildNeuroSection(data);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Relatório Digital — ${esc(data.company_name)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

*{margin:0;padding:0;box-sizing:border-box}

:root{
  --bg:#0f1315;
  --surface:#171c1f;
  --surface-2:#1e2529;
  --surface-3:#252d33;
  --border:#2a3038;
  --border-2:#333c44;
  --text:#f0f4f4;
  --text-dim:#c4cdd4;
  --text-muted:#6b7f8c;
  --emerald:#11bc76;
  --aqua:#39f7b2;
  --amber:#fbbf24;
  --rose:#f87171;
  --blue:#4f5ae3;
  --purple:#a78bfa;
  --font:'Inter',system-ui,sans-serif;
}

body{
  background:var(--bg);
  color:var(--text);
  font-family:var(--font);
  font-size:15px;
  line-height:1.65;
  min-height:100vh;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}

body::before{
  content:'';position:fixed;top:0;left:0;right:0;bottom:0;
  background:rgba(17,188,118,0.03);
  pointer-events:none;z-index:0;
}

.container{max-width:900px;margin:0 auto;padding:40px 24px;position:relative;z-index:1}

/* ===== HEADER ===== */
.header{
  display:flex;align-items:center;gap:36px;
  padding:40px 44px;margin-bottom:32px;
  background:var(--surface);
  border-radius:24px;border:1px solid var(--border);
  backdrop-filter:blur(20px);position:relative;overflow:hidden;
}
.header::after{
  content:'';position:absolute;top:0;right:0;width:240px;height:240px;
  background:${ringColor}08;pointer-events:none;
}
.gauge-wrap{flex-shrink:0;position:relative;width:130px;height:130px}
.gauge-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.gauge-score{font-size:34px;font-weight:900;letter-spacing:-1.5px;color:${ringColor};line-height:1}
.gauge-max{font-size:12px;color:var(--text-muted);font-weight:600;margin-top:2px}
.header-info{flex:1;min-width:0}
.company-name{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:3px;line-height:1.2}
.category{font-size:12px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600}
.overall-label{font-size:17px;font-weight:700;color:${ringColor};margin-bottom:10px}
.date-badge{
  display:inline-flex;align-items:center;gap:6px;
  font-size:12px;color:var(--text-muted);font-weight:500;
  background:var(--surface-2);padding:6px 14px;border-radius:99px;
  border:1px solid var(--border);letter-spacing:.3px;
}

/* ===== SECTION TITLES ===== */
.section-label{
  font-size:11px;text-transform:uppercase;letter-spacing:2px;
  color:var(--text-muted);font-weight:700;margin-bottom:16px;padding-left:2px;
}

/* ===== OVERALL BAR ===== */
.overall-bar-section{margin-bottom:32px;padding:0 2px}
.overall-bar-bg{height:10px;border-radius:99px;background:var(--surface-2);overflow:hidden;position:relative;border:1px solid var(--border)}
.overall-bar-fill{height:100%;border-radius:99px;background:${scoreGradient(data.overall_score)}}
.overall-goal{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--text-dim);border-radius:2px;opacity:.35}
.bar-legend{display:flex;justify-content:space-between;margin-top:7px;font-size:11px;color:var(--text-muted);position:relative;font-variant-numeric:tabular-nums}
.bar-legend .goal-label{position:absolute;transform:translateX(-50%);color:var(--text-dim);font-weight:700}

/* ===== CHANNEL CARDS ===== */
.channels-section{margin-bottom:32px}
.channels-grid{display:grid;gap:10px}
.channel-card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:16px;padding:18px 22px;cursor:pointer;
  transition:border-color .2s,transform .2s,box-shadow .2s;position:relative;overflow:hidden;
}
.channel-card:hover{border-color:var(--border-2);transform:translateY(-1px);box-shadow:0 8px 32px rgba(0,0,0,.35)}
.channel-card-header{display:flex;align-items:center;gap:14px}
.channel-icon{font-size:20px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:var(--surface-2);border-radius:10px;border:1px solid var(--border);flex-shrink:0}
.channel-meta{flex:1;min-width:0}
.channel-name{font-size:14px;font-weight:600;color:var(--text);display:block;letter-spacing:-.2px}
.channel-weight{font-size:11px;color:var(--text-muted);font-weight:500}
.channel-score-badge{font-size:16px;font-weight:800;padding:5px 14px;border-radius:10px;font-variant-numeric:tabular-nums;letter-spacing:-0.5px}
.channel-bar-wrap{margin:13px 0 4px}
.channel-bar-bg{height:6px;border-radius:99px;background:var(--surface-2);overflow:hidden;position:relative}
.channel-bar-fill{height:100%;border-radius:99px}
.channel-goal{position:absolute;top:-1px;bottom:-1px;width:1px;background:var(--text-muted);opacity:.3}
.expand-hint{font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;opacity:.4;transition:opacity .2s}
.channel-card:hover .expand-hint{opacity:.7}
.channel-expand-area{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1)}
.channel-card.expanded .channel-expand-area{max-height:500px}
.channel-card.expanded .expand-hint{display:none}
.checks-list{list-style:none;padding:12px 0 0;margin:0}
.checks-list li{font-size:13px;color:var(--text-dim);margin:5px 0;padding:7px 12px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border);line-height:1.4}
.rec-tip{font-size:13px;color:var(--text-muted);margin-top:10px;padding:10px 14px;border-left:3px solid var(--amber);background:rgba(251,191,36,.04);border-radius:0 8px 8px 0;line-height:1.5}
.no-data{color:var(--text-muted);font-size:13px;padding:8px 0}

/* ===== INFO SECTION ===== */
.info-section{background:var(--surface);border-radius:20px;padding:28px;border:1px solid var(--border);margin-bottom:32px}
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}
.info-item{padding:14px 16px;background:var(--surface-2);border-radius:12px;border:1px solid var(--border)}
.info-item span{display:block;font-size:11px;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:1px;font-weight:600}
.info-item p,.info-item a{font-size:14px;color:var(--text);font-weight:500;line-height:1.4}
.info-item a{color:var(--blue);text-decoration:none}
.info-item a:hover{text-decoration:underline}

/* ===== ACTION PLAN ===== */
.action-btn{
  width:100%;padding:18px 24px;
  background:var(--surface);
  border:1px solid var(--border);border-radius:16px;
  color:var(--text);font-size:15px;font-weight:700;font-family:var(--font);
  cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;
  transition:border-color .2s,box-shadow .2s;letter-spacing:-.2px;
}
.action-btn:hover{border-color:var(--border-2);box-shadow:0 4px 20px rgba(0,0,0,.3)}
.action-btn .arrow{transition:transform .3s;font-size:12px;margin-left:auto;color:var(--text-muted)}
.action-content{max-height:0;overflow:hidden;transition:max-height .5s cubic-bezier(.4,0,.2,1);margin-bottom:32px}
.action-content.open{max-height:2000px}
.action-list{padding:16px 0}
.action-item{
  display:flex;gap:16px;padding:16px;margin-bottom:10px;
  background:var(--surface);border:1px solid var(--border);border-radius:14px;
  animation:fadeSlideIn .4s ease forwards;animation-delay:var(--delay,0s);opacity:0;
}
.action-content.open .action-item{opacity:1}
.action-item:hover{border-color:var(--border-2)}
.action-rank{
  width:34px;height:34px;display:flex;align-items:center;justify-content:center;
  background:var(--surface-2);border-radius:10px;font-size:14px;font-weight:800;
  color:var(--text-muted);border:1px solid var(--border);flex-shrink:0;
}
.action-body{flex:1;min-width:0}
.action-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px}
.action-header strong{font-size:14px;letter-spacing:-.2px}
.action-score{font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px}
.action-priority{font-size:11px;color:var(--text-muted)}
.action-rec{font-size:13px;color:var(--text-dim);line-height:1.55}

/* ===== NEUROMARKETING ===== */
.neuro-section{
  background:var(--surface);border:1px solid var(--border);
  border-radius:24px;padding:32px;margin-bottom:32px;
}
.neuro-section-header{
  display:flex;align-items:flex-start;gap:16px;margin-bottom:28px;
  padding-bottom:24px;border-bottom:1px solid var(--border);
}
.neuro-section-icon{font-size:28px;margin-top:2px}
.neuro-section-title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.4px;margin-bottom:3px}
.neuro-section-sub{font-size:13px;color:var(--text-muted)}
.neuro-section-score{margin-left:auto;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.neuro-nivel{font-size:12px;font-weight:600;letter-spacing:.5px}

.neuro-sub-title{
  font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;
  color:var(--text-muted);margin:24px 0 14px;
}

/* Brain cards */
.neuro-brains{display:grid;gap:14px}
.neuro-brain-card{background:var(--surface-2);border:1px solid var(--border);border-radius:16px;padding:20px}
.neuro-brain-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.neuro-brain-icon{font-size:22px;width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:var(--surface-3);border-radius:12px;border:1px solid var(--border);flex-shrink:0}
.neuro-brain-meta{flex:1}
.neuro-brain-label{font-size:15px;font-weight:700;color:var(--text);display:block;letter-spacing:-.2px}
.neuro-brain-desc{font-size:12px;color:var(--text-muted)}
.neuro-brain-score{font-size:22px;font-weight:900;letter-spacing:-1px}
.neuro-brain-score small{font-size:12px;font-weight:600;opacity:.6}
.neuro-bar-bg{height:5px;background:var(--surface-3);border-radius:99px;overflow:hidden;margin-bottom:14px}
.neuro-bar-fill{height:100%;border-radius:99px}
.neuro-elementos{display:grid;gap:8px}
.neuro-el{padding:12px 14px;border-radius:12px;border:1px solid var(--border)}
.neuro-el.ok{background:rgba(17,188,118,.04);border-color:rgba(17,188,118,.15)}
.neuro-el.gap{background:rgba(248,113,113,.04);border-color:rgba(248,113,113,.15)}
.neuro-el-header{display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap}
.neuro-el-header strong{font-size:13px;font-weight:600;color:var(--text);letter-spacing:-.1px}
.neuro-el-status{font-size:11px;color:var(--text-muted);margin-left:auto;font-weight:500}
.neuro-el-achado{font-size:12px;color:var(--text-dim);margin-bottom:4px;line-height:1.5}
.neuro-el-rec{font-size:12px;color:var(--text-muted);line-height:1.5}

/* Cialdini */
.cialdini-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.cialdini-card{padding:14px 16px;border-radius:14px;border:1px solid var(--border);background:var(--surface-2)}
.cialdini-card.presente{border-color:rgba(17,188,118,.2);background:rgba(17,188,118,.04)}
.cialdini-card.ausente{border-color:rgba(248,113,113,.2);background:rgba(248,113,113,.04)}
.cialdini-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.cialdini-header strong{font-size:13px;font-weight:700;color:var(--text);letter-spacing:-.1px}
.cialdini-ex{font-size:12px;color:var(--text-dim);margin-bottom:5px;line-height:1.5}
.cialdini-sug{font-size:12px;color:var(--text-muted);line-height:1.5}

/* Modules grid */
.neuro-modules-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:0}
.neuro-module-card{background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:18px}
.neuro-module-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;font-size:14px;font-weight:700;color:var(--text);letter-spacing:-.2px}
.neuro-module-score{font-size:15px;font-weight:800}
.neuro-module-detail{font-size:12px;color:var(--text-muted);margin-top:10px}

/* ATF */
.atf-checks{display:grid;gap:6px}
.atf-check{display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 10px;border-radius:8px;border:1px solid var(--border)}
.atf-check.ok{color:var(--text-dim);background:rgba(17,188,118,.04);border-color:rgba(17,188,118,.15)}
.atf-check.gap{color:var(--text-muted);background:rgba(248,113,113,.04);border-color:rgba(248,113,113,.15)}

/* Eye tracking */
.et-grid{display:grid;gap:8px;margin-bottom:8px}
.et-item{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:8px 10px;background:var(--surface-3);border-radius:8px}
.et-item span:first-child{color:var(--text-muted)}
.et-item strong{color:var(--text);font-weight:600}
.et-recs{list-style:none;margin-top:10px;display:grid;gap:5px}
.et-recs li{font-size:12px;color:var(--text-muted);padding:6px 10px;background:var(--surface-3);border-radius:7px;line-height:1.5}

/* Cores */
.cores-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cores-item{padding:10px 12px;background:var(--surface-3);border-radius:10px}
.cores-item.cores-full{grid-column:1/-1}
.cores-item span{display:block;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}
.cores-item strong{font-size:14px;color:var(--text);font-weight:700}
.cores-item p{font-size:13px;color:var(--text-dim);margin-top:3px;line-height:1.4}

/* Top 5 */
.top5-section{margin-top:24px}
.top5-list{display:grid;gap:12px;margin-top:14px}
.top5-item{display:flex;gap:16px;padding:18px;background:var(--surface-2);border:1px solid var(--border);border-radius:16px}
.top5-rank{
  width:36px;height:36px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  background:var(--surface-3);border:1px solid var(--border);
  border-radius:10px;font-size:15px;font-weight:900;color:var(--emerald);
}
.top5-body{flex:1;min-width:0}
.top5-header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px;flex-wrap:wrap}
.top5-header strong{font-size:14px;font-weight:700;color:var(--text);letter-spacing:-.2px;line-height:1.3}
.top5-tag{font-size:11px;font-weight:600;color:var(--text-muted);background:var(--surface-3);padding:3px 10px;border-radius:99px;border:1px solid var(--border);white-space:nowrap}
.top5-impacto{font-size:13px;font-weight:600;margin-bottom:5px}
.top5-como{font-size:13px;color:var(--text-dim);line-height:1.55;margin-bottom:10px}
.top5-badges{display:flex;gap:6px;flex-wrap:wrap}
.top5-badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;border:1px solid}
.top5-badge.dif-fácil,.top5-badge.dif-facil{color:#11bc76;border-color:#11bc7640;background:#11bc7610}
.top5-badge.dif-médio,.top5-badge.dif-medio{color:#fbbf24;border-color:#fbbf2440;background:#fbbf2410}
.top5-badge.dif-difícil,.top5-badge.dif-dificil{color:#f87171;border-color:#f8717140;background:#f8717110}
.top5-badge.custo{color:var(--text-muted);border-color:var(--border);background:var(--surface-3)}

/* ===== FOOTER ===== */
.footer{
  text-align:center;padding:28px 20px;
  color:var(--text-muted);font-size:12px;letter-spacing:.5px;
  border-top:1px solid var(--border);margin-top:8px;
}

@keyframes fadeSlideIn{
  from{opacity:0;transform:translateY(8px)}
  to{opacity:1;transform:translateY(0)}
}

/* ===== MOBILE ===== */
@media(max-width:640px){
  .container{padding:20px 14px}
  .header{flex-direction:column;align-items:center;text-align:center;padding:28px 20px;gap:20px}
  .gauge-wrap{width:110px;height:110px}
  .company-name{font-size:22px}
  .cialdini-grid{grid-template-columns:1fr}
  .neuro-modules-grid{grid-template-columns:1fr}
  .cores-grid{grid-template-columns:1fr}
  .top5-header{flex-direction:column}
}

/* ===== PRINT ===== */
@media print{
  body{background:#fff;color:#111;font-size:13px}
  :root{--bg:#fff;--surface:#f9fafb;--surface-2:#f3f4f6;--surface-3:#e5e7eb;--border:#e5e7eb;--border-2:#d1d5db;--text:#111;--text-dim:#374151;--text-muted:#6b7280}
  .channel-expand-area,.action-content{max-height:none!important}
  .expand-hint,.action-btn{display:none}
  body::before{display:none}
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
          stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"/>
      </svg>
      <div class="gauge-center">
        <span class="gauge-score">${data.overall_score.toFixed(1)}</span>
        <span class="gauge-max">/10</span>
      </div>
    </div>
    <div class="header-info">
      <div class="company-name">${esc(data.company_name)}</div>
      ${data.category ? `<div class="category">${esc(data.category)}</div>` : ""}
      <div class="overall-label">${esc(data.overall_label || "")}</div>
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
    <p class="section-label">Scores por Canal</p>
    <div class="channels-grid">
      ${channelCards}
    </div>
  </div>

  <!-- NEUROMARKETING COMPLETO -->
  ${neuroSection}

  <!-- RESUMO DA EMPRESA -->
  <div class="info-section">
    <p class="section-label">Resumo da Empresa</p>
    <div class="info-grid">
      ${data.address ? `<div class="info-item"><span>Endereço</span><p>${esc(data.address)}</p></div>` : ""}
      ${data.phone ? `<div class="info-item"><span>Telefone</span><p>${esc(data.phone)}</p></div>` : ""}
      ${data.website_url ? `<div class="info-item"><span>Website</span><a href="${esc(data.website_url)}">${esc(data.website_url)}</a></div>` : ""}
      ${data.total_reviews !== null ? `<div class="info-item"><span>Avaliações</span><p>${data.total_reviews} avaliações${data.avg_rating !== null ? ` • ${data.avg_rating.toFixed(1)}★` : ""}</p></div>` : ""}
      ${!data.address && !data.phone && !data.website_url && data.total_reviews === null ? `<div class="info-item"><span>Info</span><p style="color:var(--text-muted)">Nenhuma informação disponível</p></div>` : ""}
    </div>
  </div>

  <!-- PLANO DE AÇÃO -->
  <button class="action-btn" onclick="var c=document.getElementById('ac');c.classList.toggle('open');this.querySelector('.arrow').style.transform=c.classList.contains('open')?'rotate(180deg)':''">
    📋 Plano de Ação por Canal <span class="arrow">▼</span>
  </button>
  <div id="ac" class="action-content">
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
