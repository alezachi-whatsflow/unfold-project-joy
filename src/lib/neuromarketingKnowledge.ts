/**
 * Base de conhecimento local de Neuromarketing.
 * Contém explicações detalhadas e dicas de otimização para cada
 * gatilho de Cialdini, cada área cerebral, e cada módulo de análise.
 * O sistema consulta esta base internamente sem precisar buscar na web.
 */

// ─── Gatilhos de Cialdini ───

export interface KnowledgeEntry {
  titulo: string;
  descricao: string;
  como_otimizar: string[];
  exemplos_praticos: string[];
  impacto_estimado: string;
  erros_comuns: string[];
}

export const CIALDINI_KNOWLEDGE: Record<string, KnowledgeEntry> = {
  reciprocidade: {
    titulo: "Reciprocidade",
    descricao:
      "O princípio da reciprocidade diz que as pessoas sentem a obrigação de retribuir quando recebem algo de valor. Ao oferecer algo gratuitamente, você cria um vínculo psicológico que aumenta a probabilidade de conversão.",
    como_otimizar: [
      "Ofereça um e-book, checklist ou template gratuito relacionado ao seu serviço",
      "Crie uma mini-consultoria ou diagnóstico grátis como porta de entrada",
      "Disponibilize conteúdo exclusivo (vídeo-aula, webinar) em troca do e-mail",
      "Ofereça uma amostra grátis ou período trial do produto",
    ],
    exemplos_praticos: [
      "Botão 'Baixe nosso guia gratuito' na hero section",
      "Pop-up oferecendo checklist ao sair da página",
      "Seção 'Ferramentas Gratuitas' no menu principal",
    ],
    impacto_estimado: "+20-35% na geração de leads qualificados",
    erros_comuns: [
      "Oferecer algo genérico demais que não gera valor percebido",
      "Pedir muitas informações em troca (nome, empresa, telefone) — peça só o e-mail",
      "Não entregar o conteúdo imediatamente após o cadastro",
    ],
  },
  prova_social: {
    titulo: "Prova Social",
    descricao:
      "As pessoas tendem a seguir o comportamento de outras, especialmente em situações de incerteza. Depoimentos, avaliações, números de clientes e logos de empresas parceiras reduzem a percepção de risco e aumentam a confiança.",
    como_otimizar: [
      "Adicione 3-5 depoimentos reais com foto, nome completo e resultado específico obtido",
      "Mostre logos de clientes/parceiros conhecidos em uma barra de confiança",
      "Exiba números concretos: '+ de 500 empresas atendidas', '98% de satisfação'",
      "Integre avaliações do Google (estrelas) diretamente na página",
      "Use vídeo-depoimentos — são 3x mais persuasivos que texto",
    ],
    exemplos_praticos: [
      "Carrossel de depoimentos com foto + cargo + resultado",
      "Barra 'Empresas que confiam em nós' com logos",
      "Contador animado: '1.247 clientes satisfeitos'",
    ],
    impacto_estimado: "+15-25% na taxa de conversão",
    erros_comuns: [
      "Usar depoimentos genéricos sem resultados específicos",
      "Não incluir foto real — depoimentos sem rosto têm 50% menos credibilidade",
      "Colocar apenas 1-2 depoimentos — o ideal é 3-5",
    ],
  },
  autoridade: {
    titulo: "Autoridade",
    descricao:
      "As pessoas confiam mais em especialistas e figuras de autoridade. Demonstrar expertise, certificações, prêmios e tempo de mercado posiciona a marca como referência confiável no nicho.",
    como_otimizar: [
      "Destaque certificações profissionais e selos de qualidade",
      "Mencione prêmios recebidos e reconhecimentos do setor",
      "Exiba tempo de mercado: 'Desde 2010' ou '15 anos de experiência'",
      "Publique conteúdo educativo (blog, vídeos) demonstrando conhecimento",
      "Mostre participações em mídia, palestras ou eventos do setor",
    ],
    exemplos_praticos: [
      "Seção 'Reconhecimentos' com badges e selos",
      "Bio do fundador com credenciais e trajetória",
      "'Citado por: Forbes, Exame, Valor Econômico'",
    ],
    impacto_estimado: "+15-30% na percepção de confiabilidade",
    erros_comuns: [
      "Não destacar credenciais por achar que é 'se gabar'",
      "Esconder certificações em páginas secundárias em vez de colocá-las na home",
      "Usar selos falsos ou genéricos que não são verificáveis",
    ],
  },
  escassez: {
    titulo: "Escassez",
    descricao:
      "Quando algo é percebido como escasso ou limitado, seu valor percebido aumenta. A escassez genuína acelera a tomada de decisão e reduz a procrastinação. IMPORTANTE: a escassez deve ser real para não quebrar a confiança.",
    como_otimizar: [
      "Use contadores regressivos para ofertas com prazo real",
      "Mostre indicadores de estoque: 'Restam apenas 3 unidades'",
      "Limite vagas para consultorias ou turmas de cursos",
      "Exiba 'X pessoas estão vendo agora' para criar senso de concorrência",
    ],
    exemplos_praticos: [
      "Badge 'Últimas 5 vagas' ao lado do botão de inscrição",
      "Contador: 'Oferta expira em 2h 34m 12s'",
      "Notificação: '12 pessoas compraram nas últimas 24h'",
    ],
    impacto_estimado: "+20-40% na urgência de compra",
    erros_comuns: [
      "Criar escassez falsa — o consumidor percebe e perde a confiança",
      "Usar contadores que reiniciam ao recarregar — é antiético e perceptível",
      "Exagerar na escassez em todos os produtos — use com moderação",
    ],
  },
  urgencia: {
    titulo: "Urgência",
    descricao:
      "A urgência é a pressão temporal que motiva ação imediata. Diferente da escassez (quantidade limitada), a urgência foca no tempo limitado. Prazos reais e ofertas temporárias reduzem a procrastinação e aumentam a taxa de conversão.",
    como_otimizar: [
      "Defina prazos reais e comunique claramente: 'Válido até sexta-feira'",
      "Use banners de topo com contagem regressiva para promoções",
      "Ofereça bônus exclusivos para quem comprar até determinada data",
      "Envie e-mails de lembrete nas últimas horas da oferta",
    ],
    exemplos_praticos: [
      "Banner: 'Black Friday — desconto de 40% só até domingo'",
      "E-mail: 'Últimas 6 horas para garantir seu bônus'",
      "Pop-up: 'Inscrições encerram à meia-noite'",
    ],
    impacto_estimado: "+15-30% na conversão imediata",
    erros_comuns: [
      "Criar urgência sem prazo real — 'Compre agora!' sem motivo não convence",
      "Manter promoção 'urgente' permanentemente — desvaloriza a oferta",
      "Não cumprir o prazo anunciado — destrói a credibilidade",
    ],
  },
  compromisso: {
    titulo: "Compromisso e Consistência",
    descricao:
      "As pessoas buscam ser consistentes com seus compromissos anteriores. Ao dar um pequeno passo (micro-compromisso), a probabilidade de dar passos maiores aumenta significativamente. É a base da técnica 'foot-in-the-door'.",
    como_otimizar: [
      "Crie um quiz ou avaliação gratuita como primeiro passo",
      "Ofereça uma calculadora interativa que envolva o visitante",
      "Peça micro-compromissos progressivos: e-mail → webinar → reunião",
      "Use formulários de múltiplas etapas em vez de um formulário longo",
    ],
    exemplos_praticos: [
      "'Descubra seu perfil em 2 minutos' — quiz interativo",
      "Calculadora: 'Quanto você pode economizar?'",
      "Formulário em 3 etapas com barra de progresso",
    ],
    impacto_estimado: "+10-25% na taxa de conclusão de formulários",
    erros_comuns: [
      "Pedir o compromisso grande logo de cara (reunião, compra)",
      "Não ter etapas intermediárias entre o primeiro contato e a venda",
      "Formulários longos sem indicador de progresso — assustam o visitante",
    ],
  },
};

// ─── Cérebros ───

export const BRAIN_KNOWLEDGE: Record<string, KnowledgeEntry> = {
  reptiliano: {
    titulo: "Cérebro Reptiliano",
    descricao:
      "O cérebro reptiliano (tronco encefálico) é a parte mais primitiva, responsável por decisões instintivas de sobrevivência: luta ou fuga, dor vs. prazer. Ele reage a estímulos visuais fortes, contrastes, movimentos e sinais de urgência. Em marketing, é ativado por CTAs claros, gatilhos de urgência e escassez.",
    como_otimizar: [
      "Use CTAs com cores contrastantes (vermelho, laranja, verde vibrante)",
      "Posicione o CTA principal acima da dobra (above the fold)",
      "Use verbos imperativos: 'Agende agora', 'Garanta sua vaga', 'Comece grátis'",
      "Adicione elementos de urgência genuínos (prazos, contadores)",
      "Contraste visual forte entre o CTA e o fundo da página",
      "Use imagens que evoquem contraste emocional: antes/depois, problema/solução",
    ],
    exemplos_praticos: [
      "Botão CTA vermelho/laranja em fundo escuro",
      "Headline focada no problema: 'Cansado de perder clientes?'",
      "Antes e depois visual do resultado do serviço",
    ],
    impacto_estimado: "+25-40% de cliques no CTA com otimização reptiliana",
    erros_comuns: [
      "CTA da mesma cor do fundo — invisível ao cérebro reptiliano",
      "Textos genéricos como 'Saiba mais' — não ativam instinto de ação",
      "Ausência de contraste visual na página — tudo parece igual",
    ],
  },
  limbico: {
    titulo: "Cérebro Límbico",
    descricao:
      "O sistema límbico processa emoções, memórias e conexão social. É responsável pela sensação de 'gostar' ou 'não gostar' antes mesmo de racionalizar. Em marketing digital, é ativado por storytelling, rostos humanos, cores que evocam emoções e narrativas de transformação.",
    como_otimizar: [
      "Adicione fotos reais da equipe — rostos humanos geram conexão instantânea",
      "Conte a história da empresa focando na jornada e propósito",
      "Use depoimentos com emoção: 'Mudou minha vida', 'Nunca imaginei...'",
      "Aplique psicologia das cores alinhada ao nicho (azul=confiança, verde=saúde)",
      "Inclua vídeos — ativam mais áreas emocionais que texto",
      "Crie narrativas de transformação: situação antes → solução → resultado",
    ],
    exemplos_praticos: [
      "Seção 'Nossa História' com fotos reais e narrativa emocional",
      "Vídeo do fundador explicando o propósito da empresa",
      "Depoimento em vídeo de cliente com resultado emocional",
    ],
    impacto_estimado: "+15-30% de engajamento e tempo na página",
    erros_comuns: [
      "Usar apenas fotos de banco de imagens — o cérebro detecta falsidade",
      "Linguagem fria e técnica demais — não ativa emoções",
      "Ignorar storytelling — listar apenas features sem contexto emocional",
    ],
  },
  neocortex: {
    titulo: "Neocórtex",
    descricao:
      "O neocórtex é responsável pelo pensamento racional, análise lógica e justificativa da decisão. Após o cérebro reptiliano reagir e o límbico sentir, o neocórtex precisa de argumentos lógicos para 'aprovar' a decisão. Em marketing, é ativado por dados, comparações, FAQs e hierarquia visual clara.",
    como_otimizar: [
      "Organize conteúdo em hierarquia visual clara: H1 > H2 > H3",
      "Adicione FAQ respondendo as 5-7 principais objeções",
      "Use tabelas comparativas: seu plano vs. concorrentes",
      "Apresente dados e números concretos: ROI, % de melhoria, economia",
      "Reduza itens do menu para 5-7 (Lei de Hick: menos opções = decisão mais rápida)",
      "Inclua garantia de satisfação para eliminar a última barreira racional",
    ],
    exemplos_praticos: [
      "Tabela 'Por que nos escolher' com checkmarks vs. concorrência",
      "FAQ com 7 perguntas que eliminam objeções de compra",
      "Selo 'Garantia de 30 dias ou seu dinheiro de volta'",
    ],
    impacto_estimado: "+10-20% na taxa de conclusão da compra",
    erros_comuns: [
      "Não responder objeções comuns — o neocórtex bloqueia a compra",
      "Excesso de informação sem organização — causa overload cognitivo",
      "Mais de 7 itens no menu — paralisia de decisão (Lei de Hick)",
    ],
  },
};

// ─── Módulos de análise (Above the Fold, Eye Tracking, Psicologia das Cores) ───

export const MODULE_KNOWLEDGE: Record<string, KnowledgeEntry> = {
  above_the_fold: {
    titulo: "Above the Fold",
    descricao:
      "A área 'above the fold' é tudo que o visitante vê SEM rolar a página. Estudos mostram que 80% do tempo de atenção é gasto nesta área. Os primeiros 3-5 segundos determinam se o visitante continua ou sai. É a zona mais crítica de toda a página.",
    como_otimizar: [
      "Inclua uma proposta de valor clara e concisa (máx. 10 palavras)",
      "Posicione o CTA principal nesta área com cor contrastante",
      "Adicione uma imagem de pessoa real olhando para o CTA (direcionamento visual)",
      "Inclua um elemento de confiança: selo, avaliação ou número de clientes",
      "Tempo de compreensão ideal: 3-5 segundos. Teste com pessoas reais",
      "Remova qualquer elemento que não contribua diretamente para a ação desejada",
    ],
    exemplos_praticos: [
      "Headline: 'Automatize suas cobranças em 5 minutos' + botão 'Comece Grátis'",
      "Foto de cliente satisfeito + selo '4.9/5 no Google' + CTA",
      "Vídeo curto (30s) explicando o valor + botão de ação",
    ],
    impacto_estimado: "+30-50% na taxa de retenção inicial do visitante",
    erros_comuns: [
      "Slider/carrossel na hero — divide a atenção e reduz conversão em até 30%",
      "Headline genérica como 'Bem-vindo ao nosso site'",
      "CTA abaixo da dobra — 70% dos visitantes não rolam até lá",
    ],
  },
  eye_tracking: {
    titulo: "Eye Tracking Simulado",
    descricao:
      "O eye tracking analisa para onde o olho do visitante é naturalmente direcionado. Na web, dois padrões dominam: o F-pattern (leitura de texto) e o Z-pattern (páginas com poucos blocos). O CTA deve estar na 'zona quente' — onde o olhar naturalmente para.",
    como_otimizar: [
      "Para páginas com texto: siga o F-pattern — informação importante no topo e lado esquerdo",
      "Para landing pages: siga o Z-pattern — logo (canto superior esquerdo) → headline → imagem → CTA (canto inferior direito)",
      "Posicione o CTA principal na zona quente (quadrante superior direito ou centro)",
      "Use o olhar de pessoas em fotos para direcionar atenção ao CTA",
      "Limite distrações visuais: banners animados, pop-ups excessivos, auto-play de vídeos",
      "Use espaço em branco para guiar o olhar entre seções",
    ],
    exemplos_praticos: [
      "Foto de pessoa olhando para o formulário de cadastro",
      "Seta visual sutil apontando para o botão de CTA",
      "Espaço em branco generoso ao redor do CTA para isolá-lo visualmente",
    ],
    impacto_estimado: "+15-25% de cliques no CTA com posicionamento correto",
    erros_comuns: [
      "CTA no canto inferior esquerdo — zona fria de atenção",
      "Muitos elementos competindo pela atenção na mesma área",
      "Menu complexo com dropdowns que distraem do objetivo principal",
    ],
  },
  psicologia_cores: {
    titulo: "Psicologia das Cores",
    descricao:
      "As cores influenciam 60-80% da decisão de compra (Institute for Color Research). Cada cor evoca emoções específicas e deve ser alinhada ao nicho e público-alvo. A cor do CTA deve contrastar com o fundo para ativar o cérebro reptiliano.",
    como_otimizar: [
      "Azul: confiança, segurança → ideal para B2B, SaaS, saúde, finanças",
      "Verde: crescimento, saúde, dinheiro → ideal para saúde, sustentabilidade, finanças",
      "Vermelho: urgência, paixão → ideal para CTAs, promoções, alimentação",
      "Laranja: entusiasmo, acessibilidade → ideal para CTAs secundários, e-commerce",
      "Roxo: luxo, criatividade → ideal para marcas premium, beleza, educação",
      "Preto: sofisticação, exclusividade → ideal para moda, luxo, tecnologia",
      "Amarelo: otimismo, atenção → use com moderação para destaques e avisos",
    ],
    exemplos_praticos: [
      "Site de saúde: fundo branco, azul principal, verde nos CTAs",
      "E-commerce: vermelho/laranja nos botões 'Comprar', azul na navegação",
      "SaaS B2B: azul/roxo dominante, laranja nos CTAs para contraste",
    ],
    impacto_estimado: "Cores adequadas aumentam reconhecimento da marca em até 80%",
    erros_comuns: [
      "CTA da mesma cor do fundo — não chama atenção",
      "Usar vermelho como cor principal em site de saúde — evoca perigo",
      "Excesso de cores (mais de 3-4) — polui visualmente e reduz profissionalismo",
    ],
  },
};
