// ─── Meta Domain & Business Verification ───

export interface MetaChecklistItem {
  requisito: string;
  status: "ok" | "pendente" | "ausente";
  onde_corrigir: string;
  como_corrigir: string;
  critico: boolean;
}

export interface LegalDataItem {
  encontrado: boolean;
  valor: string;
  localizacao: string;
  tipo?: string;
}

export interface MetaDomainVerification {
  score: number;
  status: "Pronto" | "Parcialmente Pronto" | "Não Pronto";
  checklist: MetaChecklistItem[];
  metodo_recomendado: "Meta Tag" | "DNS TXT" | "Arquivo HTML";
  justificativa_metodo: string;
  passos_verificacao_meta: string[];
}

export interface MetaBusinessVerification {
  score: number;
  status: "Pronto para Verificar" | "Incompleto" | "Crítico";
  prontidao_whatsapp_api: boolean;
  dados_legais_encontrados: {
    razao_social: LegalDataItem;
    cnpj: LegalDataItem;
    endereco: LegalDataItem;
    telefone: LegalDataItem & { tipo: "corporativo" | "pessoal" };
    email: LegalDataItem & { tipo: "corporativo" | "gratuito" };
  };
  inconsistencias_detectadas: string[];
  documentos_necessarios_brasil: string[];
  alertas_criticos: string[];
  plano_preparacao: { ordem: number; acao: string; onde: string; impacto: "Bloqueante" | "Alto" | "Médio" }[];
}

export interface MetaVerificationResult {
  domain_verification: MetaDomainVerification;
  business_verification: MetaBusinessVerification;
}

// ─── WhatsApp Button Analysis ───

export interface WhatsAppRecommendation {
  acao: string;
  por_que: string;
  impacto_conversao: "Alto" | "Médio" | "Baixo";
  como_implementar: string;
}

export interface WhatsAppButtonAnalysis {
  encontrado: boolean;
  score_acessibilidade: number;
  configuracao_atual: {
    tipo: "Flutuante" | "Inline" | "Ausente";
    posicao: string;
    visivel_mobile: boolean;
    visivel_desktop: boolean;
    tamanho_adequado: boolean;
    contraste_adequado: boolean;
    tem_label_texto: boolean;
    tempo_para_aparecer: string;
  };
  problemas_detectados: string[];
  boas_praticas_faltando: string[];
  recomendacoes: WhatsAppRecommendation[];
  configuracao_ideal: {
    posicao: string;
    tamanho: string;
    z_index: string;
    delay: string;
    label: string;
    animacao: string;
    mobile: string;
    numero: string;
  };
}

// ─── Legal Data for Meta ───

export interface LegalDataCheckItem {
  dado: string;
  status: "presente" | "ausente" | "incompleto" | "formato_incorreto";
  valor_encontrado: string;
  pagina_encontrada: string;
  alerta: string;
  acao_corretiva: string;
  impacto_meta: "Bloqueante para verificação" | "Importante" | "Recomendado";
}

export interface LegalDataAnalysis {
  score_prontidao: number;
  resumo: string;
  itens: LegalDataCheckItem[];
  coerencia_dados: {
    nome_dominio_vs_razao_social: "Coerente" | "Divergente" | "Não verificável";
    email_dominio_correto: boolean;
    observacao: string;
  };
  onde_adicionar_dados: {
    recomendacao: string;
    modelo_rodape: string;
    importancia: string;
  };
}

// ─── Neuromarketing ───

export interface NeuroElement {
  elemento: string;
  status: string;
  achado: string;
  recomendacao: string;
}

export interface CialdiniTrigger {
  presente: boolean;
  exemplo: string;
  sugestao: string;
}

export interface NeuroImprovement {
  posicao: number;
  melhoria: string;
  principio: string;
  impacto_conversao_estimado: string;
  como_implementar: string;
  dificuldade: "Fácil" | "Médio" | "Difícil";
  custo: "Gratuito" | "Baixo" | "Médio";
}

export interface NeuromarketingAnalysis {
  score_geral: number;
  nivel: "Otimizado para Conversão" | "Em Desenvolvimento" | "Neutro" | "Contra-produtivo";

  cerebro_reptiliano: {
    score: number;
    descricao: string;
    elementos_analisados: NeuroElement[];
    principios_aplicados: string[];
    gaps: string[];
  };

  cerebro_limbico: {
    score: number;
    descricao: string;
    elementos_analisados: NeuroElement[];
    gaps: string[];
  };

  neocortex: {
    score: number;
    descricao: string;
    elementos_analisados: NeuroElement[];
    gaps: string[];
  };

  gatilhos_cialdini: {
    reciprocidade: CialdiniTrigger;
    prova_social: CialdiniTrigger;
    autoridade: CialdiniTrigger;
    escassez: CialdiniTrigger;
    urgencia: CialdiniTrigger;
    compromisso: CialdiniTrigger;
  };

  eye_tracking_simulado: {
    padrao_detectado: "F-pattern" | "Z-pattern" | "Indefinido";
    cta_na_zona_quente: boolean;
    whatsapp_na_zona_quente: boolean;
    distracoes_detectadas: string[];
    recomendacoes_layout: string[];
  };

  psicologia_das_cores: {
    cor_predominante: string;
    emocao_evocada: string;
    adequacao_para_nicho: "Excelente" | "Adequada" | "Neutra" | "Inadequada";
    cor_cta_principal: string;
    contraste_cta_adequado: boolean;
    sugestao_cores: string;
  };

  above_the_fold: {
    score: number;
    tem_proposta_valor_clara: boolean;
    tem_cta_visivel: boolean;
    tem_imagem_de_pessoa: boolean;
    tem_elemento_confianca: boolean;
    tempo_compreensao_estimado: string;
    recomendacoes: string[];
  };

  mobile_neuro: {
    score: number;
    thumb_zone_cta: boolean;
    velocidade_percepcao: string;
    gaps_mobile: string[];
  };

  top5_melhorias_neuromarketing: NeuroImprovement[];
}

// ─── Combined Analysis Result ───

export interface ExtendedAnalysisResult {
  meta_verification: MetaVerificationResult | null;
  whatsapp_button: WhatsAppButtonAnalysis | null;
  dados_legais: LegalDataAnalysis | null;
  neuromarketing: NeuromarketingAnalysis | null;
}
