import { WebScrap } from "@/types/intelligence";
import {
  MetaVerificationResult,
  MetaDomainVerification,
  MetaBusinessVerification,
  MetaChecklistItem,
  LegalDataItem,
} from "@/types/analysisModules";

// ─── CNPJ regex (flexible) ───
const CNPJ_REGEX = /\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-\s]?\d{4})/g;
const FREE_EMAIL_DOMAINS = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com", "aol.com", "icloud.com"];

export function analyzeMetaVerification(scrap: WebScrap | null): MetaVerificationResult {
  const markdown = scrap?.raw_markdown || "";
  const url = scrap?.url || "";
  const title = scrap?.title || "";
  const description = scrap?.description || "";

  const domain = extractDomain(url);
  const domainVerification = analyzeDomainVerification(url, markdown, domain);
  const businessVerification = analyzeBusinessVerification(markdown, domain, title);

  return { domain_verification: domainVerification, business_verification: businessVerification };
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function analyzeDomainVerification(url: string, markdown: string, domain: string): MetaDomainVerification {
  const checklist: MetaChecklistItem[] = [];
  const lowerMd = markdown.toLowerCase();

  // SSL
  const hasSSL = url.startsWith("https://") || url.startsWith("https");
  checklist.push({
    requisito: "SSL ativo (HTTPS)",
    status: hasSSL ? "ok" : "ausente",
    onde_corrigir: hasSSL ? "" : "Painel de hospedagem → Certificado SSL",
    como_corrigir: hasSSL ? "" : "Ative o SSL gratuito (Let's Encrypt) no painel da hospedagem ou CDN (Cloudflare).",
    critico: true,
  });

  // Meta tag facebook-domain-verification
  const hasFbTag = lowerMd.includes("facebook-domain-verification");
  checklist.push({
    requisito: "Meta tag facebook-domain-verification",
    status: hasFbTag ? "ok" : "ausente",
    onde_corrigir: hasFbTag ? "" : "HTML do site → <head>",
    como_corrigir: hasFbTag ? "" : "Adicione <meta name=\"facebook-domain-verification\" content=\"SEU_CÓDIGO\"> no <head> do site.",
    critico: true,
  });

  // Robots.txt
  const hasRobots = lowerMd.includes("robots.txt") || lowerMd.includes("robots");
  checklist.push({
    requisito: "Robots.txt acessível",
    status: hasRobots ? "pendente" : "pendente",
    onde_corrigir: `${domain}/robots.txt`,
    como_corrigir: "Crie um arquivo robots.txt na raiz do site permitindo os bots do Google e Meta.",
    critico: false,
  });

  // Sitemap
  const hasSitemap = lowerMd.includes("sitemap");
  checklist.push({
    requisito: "Sitemap.xml acessível",
    status: hasSitemap ? "ok" : "pendente",
    onde_corrigir: `${domain}/sitemap.xml`,
    como_corrigir: "Gere um sitemap.xml e envie ao Google Search Console.",
    critico: false,
  });

  // Corporate email
  const emails = markdown.match(EMAIL_REGEX) || [];
  const corporateEmail = emails.find((e) => {
    const emailDomain = e.split("@")[1]?.toLowerCase();
    return emailDomain && !FREE_EMAIL_DOMAINS.includes(emailDomain);
  });
  checklist.push({
    requisito: "E-mail corporativo com domínio do site",
    status: corporateEmail ? "ok" : "ausente",
    onde_corrigir: corporateEmail ? "" : "Provedor de e-mail (Google Workspace, Zoho, etc.)",
    como_corrigir: corporateEmail ? "" : `Crie um e-mail profissional como contato@${domain}.`,
    critico: true,
  });

  // DNS TXT
  checklist.push({
    requisito: "DNS TXT Record para verificação Meta",
    status: "pendente",
    onde_corrigir: "Registrador de domínio → Gerenciar DNS",
    como_corrigir: "Adicione o registro TXT fornecido pelo Meta Business Suite no DNS do domínio.",
    critico: false,
  });

  const okCount = checklist.filter((c) => c.status === "ok").length;
  const total = checklist.length;
  const score = Math.round((okCount / total) * 10 * 10) / 10;

  return {
    score,
    status: score >= 7 ? "Pronto" : score >= 4 ? "Parcialmente Pronto" : "Não Pronto",
    checklist,
    metodo_recomendado: hasFbTag ? "Meta Tag" : "Meta Tag",
    justificativa_metodo: "Meta Tag é o método mais rápido: basta adicionar uma linha no <head> do site.",
    passos_verificacao_meta: [
      "1. Acesse business.facebook.com → Configurações → Segurança da Marca → Domínios",
      "2. Clique em Adicionar e insira seu domínio raiz (ex: " + domain + ")",
      "3. Escolha o método Meta Tag",
      "4. Copie a meta tag gerada e cole no <head> do site",
      "5. Clique em Verificar — a confirmação é quase instantânea",
    ],
  };
}

function analyzeBusinessVerification(markdown: string, domain: string, siteTitle: string): MetaBusinessVerification {
  const lowerMd = markdown.toLowerCase();

  // Extract CNPJ
  const cnpjMatches = markdown.match(CNPJ_REGEX) || [];
  const cnpj: LegalDataItem = {
    encontrado: cnpjMatches.length > 0,
    valor: cnpjMatches[0] || "",
    localizacao: cnpjMatches.length > 0 ? "Detectado no conteúdo do site" : "",
  };

  // Extract emails
  const allEmails = markdown.match(EMAIL_REGEX) || [];
  const corpEmail = allEmails.find((e) => !FREE_EMAIL_DOMAINS.includes(e.split("@")[1]?.toLowerCase()));
  const freeEmail = allEmails.find((e) => FREE_EMAIL_DOMAINS.includes(e.split("@")[1]?.toLowerCase()));
  const emailItem: LegalDataItem & { tipo: "corporativo" | "gratuito" } = {
    encontrado: allEmails.length > 0,
    valor: corpEmail || freeEmail || "",
    localizacao: allEmails.length > 0 ? "Detectado no conteúdo" : "",
    tipo: corpEmail ? "corporativo" : "gratuito",
  };

  // Extract phones
  const phones = markdown.match(PHONE_REGEX) || [];
  const phoneItem: LegalDataItem & { tipo: "corporativo" | "pessoal" } = {
    encontrado: phones.length > 0,
    valor: phones[0] || "",
    localizacao: phones.length > 0 ? "Detectado no conteúdo" : "",
    tipo: phones.length > 0 ? "corporativo" : "pessoal",
  };

  // Razão Social — explicit label OR company suffix patterns (LTDA, ME, S.A., EIRELI, etc.)
  const razaoLabelMatch = markdown.match(/(?:razão\s*social|razao\s*social)[:\s]*([^\n]{5,80})/i);
  const razaoSuffixMatch = markdown.match(/([A-ZÀ-Ú][A-Za-zÀ-ú\s&.'-]{3,60}(?:\s(?:LTDA|ltda|Ltda|ME|me|Me|S[\.\s]*A|SA|sa|EIRELI|eireli|EPP|epp|SLU|slu|EMPRESARIAL|S\/S|SS)))/);
  const razaoFound = razaoLabelMatch || razaoSuffixMatch;
  const razaoVal = razaoLabelMatch?.[1]?.trim() || razaoSuffixMatch?.[1]?.trim() || "";
  const razaoSocial: LegalDataItem = {
    encontrado: !!razaoFound,
    valor: razaoVal,
    localizacao: razaoFound ? "Detectado no conteúdo" : "",
  };

  // Address heuristic
  const addressPatterns = [/(?:endereço|endereco|rua|av\.|avenida|alameda)[:\s]*([^\n]{10,150})/i];
  let addressVal = "";
  for (const pat of addressPatterns) {
    const m = markdown.match(pat);
    if (m) { addressVal = m[1].trim(); break; }
  }
  const endereco: LegalDataItem = {
    encontrado: !!addressVal,
    valor: addressVal,
    localizacao: addressVal ? "Detectado no conteúdo" : "",
  };

  // Pages check
  const hasAbout = lowerMd.includes("sobre") || lowerMd.includes("quem somos") || lowerMd.includes("about");
  const hasPrivacy = lowerMd.includes("privacidade") || lowerMd.includes("privacy");
  const hasTerms = lowerMd.includes("termos de uso") || lowerMd.includes("terms");

  const inconsistencias: string[] = [];
  if (emailItem.encontrado && emailItem.tipo === "gratuito") {
    inconsistencias.push(`E-mail gratuito (${emailItem.valor}) em vez de corporativo @${domain}`);
  }
  if (!hasPrivacy) inconsistencias.push("Política de Privacidade não encontrada — obrigatória pela Meta");
  if (!hasAbout) inconsistencias.push("Página Sobre/Quem Somos não encontrada");

  const alertas: string[] = [];
  if (!cnpj.encontrado) alertas.push("CNPJ não encontrado no site — bloqueante para Business Verification");
  if (!razaoSocial.encontrado) alertas.push("Razão Social não encontrada no site");
  if (!hasPrivacy) alertas.push("Política de Privacidade ausente — obrigatória pela Meta");

  const plano: MetaBusinessVerification["plano_preparacao"] = [];
  let ordem = 1;
  if (!cnpj.encontrado) plano.push({ ordem: ordem++, acao: "Adicionar CNPJ no rodapé do site", onde: "Footer do site", impacto: "Bloqueante" });
  if (!razaoSocial.encontrado) plano.push({ ordem: ordem++, acao: "Adicionar Razão Social no rodapé", onde: "Footer do site", impacto: "Bloqueante" });
  if (!hasPrivacy) plano.push({ ordem: ordem++, acao: "Criar página de Política de Privacidade", onde: "Nova página /politica-de-privacidade", impacto: "Bloqueante" });
  if (emailItem.tipo === "gratuito") plano.push({ ordem: ordem++, acao: `Criar e-mail profissional @${domain}`, onde: "Google Workspace ou Zoho Mail", impacto: "Alto" });
  if (!endereco.encontrado) plano.push({ ordem: ordem++, acao: "Adicionar endereço completo no site", onde: "Footer ou página de Contato", impacto: "Alto" });

  const foundCount = [cnpj, emailItem, phoneItem, razaoSocial, endereco].filter((i) => i.encontrado).length;
  const pagesCount = [hasAbout, hasPrivacy, hasTerms].filter(Boolean).length;
  const score = Math.round(((foundCount / 5) * 6 + (pagesCount / 3) * 4) * 10) / 10;

  return {
    score,
    status: score >= 7 ? "Pronto para Verificar" : score >= 4 ? "Incompleto" : "Crítico",
    prontidao_whatsapp_api: score >= 7 && cnpj.encontrado && hasPrivacy,
    dados_legais_encontrados: {
      razao_social: razaoSocial,
      cnpj,
      endereco,
      telefone: phoneItem,
      email: emailItem,
    },
    inconsistencias_detectadas: inconsistencias,
    documentos_necessarios_brasil: [
      "Contrato Social ou Estatuto Social registrado",
      "Cartão CNPJ emitido pela Receita Federal",
      "Comprovante de endereço em nome da empresa (conta de luz, água ou telefone)",
      "Certificado de Inscrição Estadual ou Municipal (se aplicável)",
    ],
    alertas_criticos: alertas,
    plano_preparacao: plano,
  };
}
