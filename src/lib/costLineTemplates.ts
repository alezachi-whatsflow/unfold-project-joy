import { CostLineTemplate } from "@/types/costLines";

let nextId = 1;
const t = (
  category: string,
  subcategory: string,
  block: CostLineTemplate["block"],
  costType: CostLineTemplate["costType"],
  supplier: string,
  description: string
): CostLineTemplate => ({
  id: `default-${nextId++}`,
  category,
  subcategory,
  block,
  costType,
  supplier,
  description,
  isDefault: true,
});

export const DEFAULT_COST_LINES: CostLineTemplate[] = [
  // MKT — Marketing
  t("Despesas Comerciais", "Brindes para Clientes", "MKT", "variable", "", "Somente ações de relacionamento/fechamento"),
  t("Despesas Comerciais", "Marketing e Publicidade (guarda-chuva)", "MKT", "mixed", "Agência, criação, conteúdo", "Use apenas como 'pasta'; prefira subitens abaixo"),
  t("Despesas Comerciais", "Criação/Design/Vídeo/Copy", "MKT", "variable", "Designer, vídeo, copywriter", "Produção criativa (não é mídia paga)"),
  t("Despesas Comerciais", "Conteúdo/SEO/Blog", "MKT", "variable", "Redator, ferramentas SEO", "Geração orgânica/educação"),
  t("Despesas Comerciais", "Ferramentas de Marketing", "MKT", "fixed", "LP/automação, e-mail mkt", "Ferramentas usadas para captação/nutrição"),
  t("Despesas Comerciais", "Tráfego (guarda-chuva)", "MKT", "variable", "Mídia paga", "Use como 'pasta'; prefira subitens abaixo"),
  t("Despesas Comerciais", "Google Ads (mídia paga)", "MKT", "variable", "Google Ads", "CPC/CPM/Conversões"),
  t("Despesas Comerciais", "Meta Ads (mídia paga)", "MKT", "variable", "Facebook/Instagram Ads", "CPC/CPM/Leads"),
  t("Despesas Comerciais", "Campanhas WhatsApp (Meta API) — Aquisição", "MKT", "variable", "Meta API (disparos base fria, reativação)", "Somente uso com objetivo de captação/reativação"),

  // G&A — General & Administrative
  t("Despesas Comerciais", "Viagens e Representações", "G&A", "variable", "Visitas, reuniões, eventos", "Deslocamentos para venda/relacionamento (não diretoria)"),

  // FIN — Financeiro
  t("Despesas Financeiras", "Tarifas bancárias", "FIN", "variable", "Tarifas, TED/DOC, manutenção", "Custos bancários recorrentes"),
  t("Despesas Financeiras", "Juros/Encargos/Multas", "FIN", "variable", "Juros, multa, atraso", "Não inclui impostos"),
  t("Despesas Financeiras", "IOF / Taxas internacionais", "FIN", "variable", "IOF cartão/compra exterior", "Taxas financeiras internacionais"),

  // CSP — Custo de Prestação do Serviço
  t("Custos de Prestação do Serviço (CSP)", "IA/LLM — Consumo do Cliente", "CSP", "variable", "OpenAI, outras LLMs (uso do produto)", "Somente consumo ligado ao uso do cliente"),
  t("Custos de Prestação do Serviço (CSP)", "WhatsApp API (Meta) — Operação do Cliente", "CSP", "variable", "Mensagens/conversas META", "Uso do produto (não campanha)"),
  t("Custos de Prestação do Serviço (CSP)", "Conexões WhatsApp — API Web (licenças)", "CSP", "variable", "Four Pixels/Z-API, por cliente", "Licenças necessárias para entregar serviço"),
  t("Custos de Prestação do Serviço (CSP)", "Storage Infra produção — App/API", "CSP", "mixed", "Vercel (produção)", "Infra necessária para rodar o produto em produção"),
  t("Custos de Prestação do Serviço (CSP)", "Servidor Banco de dados — Produção", "CSP", "mixed", "Visão NET/Processamento/Tokens", "Base e processamento de dados"),
  t("Custos de Prestação do Serviço (CSP)", "Storage/Streaming/CDN — Produção (Cloudflare)", "CSP", "mixed", "Cloudflare R2/Stream/CDN", "Armazenamento e entrega de mídia do cliente"),
  t("Custos de Prestação do Serviço (CSP)", "Telecom/Numeração (serviços de números)", "CSP", "mixed", "TIM / API Oficial e Geral", "Quando é necessário para operar o serviço"),
  t("Custos de Prestação do Serviço (CSP)", "Observabilidade/Logs — Produção", "CSP", "fixed", "Logs, monitoramento, erros", "Ferramentas de estabilidade do produto"),

  // G&A — Tecnologia Interna / P&D (OPEX)
  t("Tecnologia Interna / P&D (OPEX)", "IA/LLM — Uso Interno (dev/plano)", "G&A", "mixed", "OpenAI/LLMs para time", "Somente uso interno (não clientes)"),
  t("Tecnologia Interna / P&D (OPEX)", "Ferramentas de desenvolvimento", "G&A", "fixed", "Repositório, CI/CD, gestão", "Ferramentas do time técnico"),
  t("Tecnologia Interna / P&D (OPEX)", "Infra Dev/Homologação (não produção)", "G&A", "mixed", "Ambiente dev", "Custos de ambiente não-prod"),
  t("Tecnologia Interna / P&D (OPEX)", "Softwares/Licenças técnicas", "G&A", "fixed", "IDEs, licenças", "Licenças do time"),

  // TAX — Impostos
  t("Impostos sobre Vendas e sobre Serviços", "ISS (sobre vendas)", "TAX", "variable", "", "ISS municipal"),
  t("Impostos sobre Vendas e sobre Serviços", "PIS/COFINS (sobre vendas)", "TAX", "variable", "PIS/COFINS", "Imposto sobre faturamento"),
  t("Impostos sobre Vendas e sobre Serviços", "IRPJ/CSLL (sobre lucro)", "TAX", "fixed", "IRPJ e CSLL", "Imposto sobre lucro"),

  // REV- — Deduções de Receita
  t("Outras Despesas", "Estornos/Reembolsos (dedução de receita)", "REV-", "variable", "Reembolso/cancelamento", "Preferível tratar como dedução da receita no DRE"),

  // SAL — Salários / Pessoal
  t("Funcionários / Prestação de Serviço", "Prestação de Serviço Time", "SAL", "fixed", "", "Prestação de serviço time"),
  t("Funcionários / Prestação de Serviço", "Sócios / Prestação de Serviço Diretor", "SAL", "fixed", "", "Honorários"),
];

/** Group templates by category */
export function groupByCategory(templates: CostLineTemplate[]): Record<string, CostLineTemplate[]> {
  return templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, CostLineTemplate[]>);
}
