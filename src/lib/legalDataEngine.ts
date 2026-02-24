import { LegalDataAnalysis, LegalDataCheckItem } from "@/types/analysisModules";

const CNPJ_REGEX = /\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-\s]?\d{4})/g;
const FREE_DOMAINS = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com"];

export function analyzeLegalData(rawMarkdown: string | null, url: string): LegalDataAnalysis {
  const md = rawMarkdown || "";
  const lower = md.toLowerCase();
  const domain = extractDomain(url);

  // Focus on footer — last 20% of content
  const footerStart = Math.floor(md.length * 0.8);
  const footer = md.substring(footerStart);

  const itens: LegalDataCheckItem[] = [];

  // CNPJ
  const cnpjAll = md.match(CNPJ_REGEX) || [];
  const cnpjFooter = footer.match(CNPJ_REGEX) || [];
  itens.push({
    dado: "CNPJ",
    status: cnpjAll.length > 0 ? "presente" : "ausente",
    valor_encontrado: cnpjAll[0] || "",
    pagina_encontrada: cnpjFooter.length > 0 ? "Rodapé" : cnpjAll.length > 0 ? "Conteúdo da página" : "",
    alerta: cnpjAll.length === 0 ? "CNPJ não encontrado — bloqueante para verificação Meta" : "",
    acao_corretiva: cnpjAll.length === 0 ? "Adicione o CNPJ no rodapé do site no formato XX.XXX.XXX/XXXX-XX" : "",
    impacto_meta: "Bloqueante para verificação",
  });

  // Razão Social
  const razaoMatch = md.match(/(?:razão\s*social|razao\s*social)[:\s]*([^\n]{5,80})/i);
  itens.push({
    dado: "Razão Social",
    status: razaoMatch ? "presente" : "ausente",
    valor_encontrado: razaoMatch?.[1]?.trim() || "",
    pagina_encontrada: razaoMatch ? "Conteúdo da página" : "",
    alerta: !razaoMatch ? "Razão Social não encontrada — importante para verificação Meta" : "",
    acao_corretiva: !razaoMatch ? "Adicione a Razão Social no rodapé junto ao CNPJ" : "",
    impacto_meta: "Bloqueante para verificação",
  });

  // Address
  const addressMatch = md.match(/(?:endereço|endereco|rua|av\.|avenida|alameda)[:\s]*([^\n]{10,150})/i);
  itens.push({
    dado: "Endereço",
    status: addressMatch ? "presente" : "ausente",
    valor_encontrado: addressMatch?.[1]?.trim() || "",
    pagina_encontrada: addressMatch ? "Conteúdo da página" : "",
    alerta: !addressMatch ? "Endereço não encontrado" : "",
    acao_corretiva: !addressMatch ? "Adicione endereço completo com CEP no rodapé ou página de contato" : "",
    impacto_meta: "Importante",
  });

  // Phone
  const phones = md.match(PHONE_REGEX) || [];
  itens.push({
    dado: "Telefone",
    status: phones.length > 0 ? "presente" : "ausente",
    valor_encontrado: phones[0] || "",
    pagina_encontrada: phones.length > 0 ? "Conteúdo da página" : "",
    alerta: phones.length === 0 ? "Telefone não encontrado" : "",
    acao_corretiva: phones.length === 0 ? "Adicione telefone comercial com DDD" : "",
    impacto_meta: "Importante",
  });

  // Corporate email
  const emails = md.match(EMAIL_REGEX) || [];
  const corpEmail = emails.find((e) => !FREE_DOMAINS.includes(e.split("@")[1]?.toLowerCase()));
  const isFree = !corpEmail && emails.length > 0;
  itens.push({
    dado: "E-mail Corporativo",
    status: corpEmail ? "presente" : isFree ? "formato_incorreto" : "ausente",
    valor_encontrado: corpEmail || emails[0] || "",
    pagina_encontrada: emails.length > 0 ? "Conteúdo da página" : "",
    alerta: isFree ? `E-mail gratuito (${emails[0]}) — a Meta exige e-mail corporativo` : !corpEmail ? "E-mail corporativo não encontrado" : "",
    acao_corretiva: !corpEmail ? `Crie um e-mail profissional como contato@${domain}` : "",
    impacto_meta: "Importante",
  });

  // Coherence
  const razaoVal = razaoMatch?.[1]?.trim().toLowerCase() || "";
  const domainBase = domain.replace(/\.(com|br|net|org|io)\.?/g, "").replace(/\./g, "");
  const isCoherent = razaoVal && domainBase && (razaoVal.includes(domainBase) || domainBase.includes(razaoVal.split(" ")[0]));

  const presentCount = itens.filter((i) => i.status === "presente").length;
  const score = Math.round((presentCount / itens.length) * 10 * 10) / 10;

  const resumoParts: string[] = [];
  if (presentCount === itens.length) resumoParts.push("Todos os dados legais foram encontrados.");
  else resumoParts.push(`${presentCount} de ${itens.length} dados legais encontrados.`);
  if (isFree) resumoParts.push("E-mail gratuito detectado.");

  return {
    score_prontidao: score,
    resumo: resumoParts.join(" "),
    itens,
    coerencia_dados: {
      nome_dominio_vs_razao_social: razaoVal ? (isCoherent ? "Coerente" : "Divergente") : "Não verificável",
      email_dominio_correto: !!corpEmail,
      observacao: corpEmail
        ? `E-mail corporativo ${corpEmail} detectado — coerente com o domínio.`
        : `Nenhum e-mail @${domain} encontrado.`,
    },
    onde_adicionar_dados: {
      recomendacao: "Adicionar no rodapé do site os seguintes dados obrigatórios",
      modelo_rodape: `© ${new Date().getFullYear()} [Razão Social] | CNPJ: XX.XXX.XXX/XXXX-XX | [Endereço] | contato@${domain}`,
      importancia: "A Meta verifica se o site exibe os mesmos dados enviados no Business Manager",
    },
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch {
    return url;
  }
}
