export interface NicheContext {
  niche: string;
  dores: string[];
  abordagem: string;
  resultadoEsperado: string;
  perguntaChave: string;
}

export const NICHE_CONTEXTS: Record<string, NicheContext> = {
  "escola particular": {
    niche: "Escola particular",
    dores: [
      "Dificuldade em captar novos alunos fora da temporada de matrículas",
      "Concorrência com escolas maiores e redes de ensino",
      "Baixa presença digital e dependência do boca a boca",
    ],
    abordagem: "Mostre como a presença digital pode aumentar as matrículas fora de temporada. Foque em autoridade e confiança dos pais.",
    resultadoEsperado: "Aumento de 30-50% em leads de matrícula com estratégia digital estruturada.",
    perguntaChave: "Quantos novos alunos vocês captaram pelo digital nos últimos 6 meses?",
  },
  "clínica odontológica": {
    niche: "Clínica odontológica",
    dores: [
      "Dependência de indicações e dificuldade em atrair novos pacientes",
      "Concorrência de clínicas populares e franquias",
      "Falta de estratégia de conteúdo para gerar autoridade",
    ],
    abordagem: "Destaque a importância de avaliações no Google e presença no Instagram para clínicas. Mostre cases de conversão.",
    resultadoEsperado: "Aumento de 40% no agendamento de avaliações via canais digitais.",
    perguntaChave: "Qual o canal que mais traz pacientes novos hoje para a clínica?",
  },
  "pet shop": {
    niche: "Pet shop",
    dores: [
      "Concorrência de e-commerces de pet com preços menores",
      "Dificuldade em fidelizar clientes para serviços recorrentes (banho, tosa)",
      "Pouca presença em redes sociais",
    ],
    abordagem: "Foque em fidelização via WhatsApp e agendamento online. Mostre como conteúdo de pets engaja naturalmente.",
    resultadoEsperado: "Aumento de 25% na recorrência de serviços com automação de agendamento.",
    perguntaChave: "Vocês já usam WhatsApp para lembrar os clientes dos agendamentos?",
  },
  "academia": {
    niche: "Academia",
    dores: [
      "Alta taxa de cancelamento e dificuldade de retenção",
      "Sazonalidade (janeiro e julho bombam, resto do ano cai)",
      "Concorrência de apps de treino e academias low-cost",
    ],
    abordagem: "Mostre como automação de comunicação reduz churn. Foque em campanhas de reativação e comunidade.",
    resultadoEsperado: "Redução de 20% no churn mensal com estratégia de engajamento digital.",
    perguntaChave: "Qual é a taxa de cancelamento mensal hoje?",
  },
  "restaurante": {
    niche: "Restaurante",
    dores: [
      "Dependência de apps de delivery com comissões altas (iFood, Rappi)",
      "Falta de presença no Google Meu Negócio",
      "Dificuldade em manter cardápio digital atualizado",
    ],
    abordagem: "Mostre como o Google Meu Negócio e WhatsApp podem reduzir dependência de apps de delivery.",
    resultadoEsperado: "Aumento de 35% em pedidos diretos com presença Google otimizada.",
    perguntaChave: "Quanto vocês pagam por mês em comissões para apps de delivery?",
  },
  "escritório de contabilidade": {
    niche: "Escritório de contabilidade",
    dores: [
      "Imagem ultrapassada e dificuldade em atrair empresas modernas",
      "Concorrência de contabilidades digitais (Contabilizei, etc)",
      "Falta de autoridade digital e conteúdo educativo",
    ],
    abordagem: "Posicione como parceiro estratégico, não apenas operacional. Conteúdo educativo sobre impostos atrai leads qualificados.",
    resultadoEsperado: "Captação de 5-10 novos clientes/mês com estratégia de conteúdo no LinkedIn e Google.",
    perguntaChave: "Vocês produzem algum conteúdo educativo para atrair novos clientes?",
  },
  "imobiliária": {
    niche: "Imobiliária",
    dores: [
      "Concorrência pesada de portais como ZAP e OLX",
      "Leads frios e desqualificados vindos dos portais",
      "Falta de presença própria no digital",
    ],
    abordagem: "Mostre como site próprio + Google Ads pode gerar leads mais quentes que portais. Foque no custo por lead qualificado.",
    resultadoEsperado: "Redução de 40% no custo por lead qualificado com canal próprio.",
    perguntaChave: "Qual é o custo médio por lead que vocês pagam nos portais hoje?",
  },
  "salão de beleza": {
    niche: "Salão de beleza",
    dores: [
      "Dependência de indicação boca a boca",
      "Dificuldade em mostrar portfólio de trabalhos",
      "Alta rotatividade de profissionais",
    ],
    abordagem: "Instagram é vitrine natural. Mostre como posts de antes/depois e Stories geram agendamentos diretos.",
    resultadoEsperado: "Aumento de 50% nos agendamentos via Instagram com estratégia de conteúdo.",
    perguntaChave: "Quantos agendamentos por semana vêm do Instagram hoje?",
  },
  "farmácia": {
    niche: "Farmácia",
    dores: [
      "Concorrência de grandes redes e farmácias online",
      "Margens apertadas em medicamentos genéricos",
      "Falta de comunicação com cliente entre compras",
    ],
    abordagem: "Foque em fidelização via WhatsApp para lembretes de remédios contínuos e promoções exclusivas.",
    resultadoEsperado: "Aumento de 30% na recompra com programa de fidelidade digital.",
    perguntaChave: "Vocês fazem alguma comunicação ativa com clientes entre compras?",
  },
  "oficina mecânica": {
    niche: "Oficina mecânica",
    dores: [
      "Falta de confiança dos clientes em oficinas independentes",
      "Sem presença no Google para ser encontrado",
      "Dificuldade em comunicar transparência no serviço",
    ],
    abordagem: "Google Meu Negócio é essencial para ser encontrado. Avaliações positivas constroem confiança.",
    resultadoEsperado: "Aumento de 60% em novos clientes via Google com perfil otimizado e avaliações.",
    perguntaChave: "Quantas avaliações vocês têm no Google hoje?",
  },
};

export function findNicheContext(query: string): NicheContext | null {
  const lower = query.toLowerCase().trim();
  for (const [key, ctx] of Object.entries(NICHE_CONTEXTS)) {
    if (lower.includes(key) || key.includes(lower)) return ctx;
  }
  return null;
}
