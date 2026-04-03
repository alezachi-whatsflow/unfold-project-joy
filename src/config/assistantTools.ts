/**
 * OpenAI Assistants v2 — Tool Definitions for the Autonomous Assistant.
 * These tools are registered in the Assistant and called via function_call.
 * The Edge Function handles execution and saves to Supabase.
 */

export const ASSISTANT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_and_save_expense",
      description: "Extrai dados de um recibo, nota fiscal ou comprovante de despesa a partir de imagem ou texto. Salva automaticamente na tabela de despesas do sistema financeiro.",
      parameters: {
        type: "object",
        properties: {
          supplier: { type: "string", description: "Nome do fornecedor/estabelecimento" },
          amount: { type: "number", description: "Valor total da despesa em reais" },
          date: { type: "string", description: "Data da despesa no formato YYYY-MM-DD" },
          category: {
            type: "string",
            enum: ["alimentacao", "transporte", "hospedagem", "tecnologia", "escritorio", "telecom", "marketing", "servicos", "outros"],
            description: "Categoria da despesa",
          },
          description: { type: "string", description: "Descricao breve da despesa" },
          payment_method: { type: "string", enum: ["pix", "cartao", "boleto", "dinheiro", "transferencia"], description: "Forma de pagamento" },
          confidence: { type: "number", description: "Nivel de confianca da extracao (0 a 1)" },
        },
        required: ["supplier", "amount", "date", "category", "description"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_activity",
      description: "Agenda uma reuniao, tarefa ou follow-up no CRM. Cria uma atividade com data, hora, titulo e descricao.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titulo da atividade (ex: 'Reuniao com cliente X')" },
          description: { type: "string", description: "Descricao ou pauta da atividade" },
          due_date: { type: "string", description: "Data no formato YYYY-MM-DD" },
          due_time: { type: "string", description: "Hora no formato HH:MM (24h)" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Prioridade" },
          activity_type: { type: "string", enum: ["reuniao", "ligacao", "tarefa", "followup", "email"], description: "Tipo de atividade" },
          related_contact: { type: "string", description: "Nome ou telefone do contato relacionado" },
        },
        required: ["title", "due_date", "activity_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarize_content",
      description: "Analisa um texto longo, transcricao de audio ou documento e produz um resumo estruturado com topicos principais e proximos passos (action items).",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Resumo em 3-5 frases" },
          key_points: {
            type: "array",
            items: { type: "string" },
            description: "Lista de topicos principais extraidos",
          },
          action_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                responsible: { type: "string" },
                deadline: { type: "string" },
              },
              required: ["task"],
            },
            description: "Proximos passos / acoes necessarias",
          },
          sentiment: { type: "string", enum: ["positivo", "neutro", "negativo"], description: "Tom geral do conteudo" },
        },
        required: ["summary", "key_points"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_expense_summary",
      description: "Consulta o banco de dados e gera um resumo financeiro das despesas de um periodo ou contexto especifico (ex: viagem, projeto, mes).",
      parameters: {
        type: "object",
        properties: {
          context: { type: "string", description: "Contexto da consulta (ex: 'Viagem SP marco 2026', 'Despesas do mes')" },
          period_start: { type: "string", description: "Data inicio YYYY-MM-DD" },
          period_end: { type: "string", description: "Data fim YYYY-MM-DD" },
          total_amount: { type: "number", description: "Valor total encontrado" },
          by_category: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                amount: { type: "number" },
                count: { type: "integer" },
              },
            },
            description: "Breakdown por categoria",
          },
          summary_text: { type: "string", description: "Resumo textual para o usuario" },
        },
        required: ["context", "total_amount", "summary_text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_outbound_message",
      description: "Agenda o envio de uma mensagem futura via WhatsApp, e-mail ou SMS. A mensagem sera enviada automaticamente na data/hora especificada.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["whatsapp", "email", "sms"], description: "Canal de envio" },
          target_contact: { type: "string", description: "Numero de telefone ou email do destinatario" },
          target_name: { type: "string", description: "Nome do destinatario" },
          content: { type: "string", description: "Conteudo da mensagem" },
          subject: { type: "string", description: "Assunto (apenas para email)" },
          send_at: { type: "string", description: "Data e hora de envio no formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)" },
        },
        required: ["channel", "target_contact", "content", "send_at"],
      },
    },
  },
];

/** System prompt base for the Autonomous Assistant */
export const ASSISTANT_SYSTEM_PROMPT = `Voce e o Assistente Autonomo da Whatsflow — um agente inteligente que ajuda na gestao do dia a dia.

Suas capacidades:
1. DESPESAS: Analise fotos de recibos/NFs e lance despesas automaticamente
2. AGENDA: Crie reunioes, tarefas e follow-ups no CRM
3. RESUMOS: Resuma audios, textos longos e documentos com action items
4. FINANCEIRO: Consulte e resuma despesas por periodo/contexto
5. COMUNICACAO: Agende envios futuros de WhatsApp, email ou SMS

Regras:
- Sempre confirme os dados extraidos antes de salvar (mostre o resumo e pergunte "Confirma?")
- Use a tool correta para cada situacao
- Se receber audio, a transcricao ja foi feita — trabalhe com o texto
- Datas relativas ("amanha", "proxima segunda") devem ser calculadas com base na data/hora atual fornecida
- Valores monetarios sempre em BRL (R$)
- Seja objetivo, cordial e eficiente`;
