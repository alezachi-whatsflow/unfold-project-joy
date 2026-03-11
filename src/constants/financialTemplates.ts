export const FINANCIAL_TEMPLATES = {
  paymentDue: (name: string, value: string, dueDate: string, link?: string) => ({
    text: `Olá ${name}! 🤑\n\nSua fatura de *R$ ${value}* vence em *${dueDate}*.\n\n${
      link ? `Pague aqui: ${link}` : "Responda esta mensagem para mais detalhes."
    }\n\n_Whatsflow Finance_ 🧾`,
    track_source: "financeiro",
    track_id: `due_${Date.now()}`,
  }),

  paymentConfirmed: (name: string, value: string, ref: string) => ({
    text: `📄 *Pagamento confirmado!*\n\nOlá ${name}, recebemos *R$ ${value}*.\n🧾 Ref: ${ref}\n\nObrigado pela pontualidade! 💰\n\n_Whatsflow Finance_ 🧾`,
    track_source: "financeiro",
  }),

  paymentOverdue: (name: string, value: string, days: number) => ({
    text: `⚠️ *Aviso de atraso*\n\nOlá ${name}, sua fatura de *R$ ${value}* está *${days} dia(s)* em atraso.\n\nRegularize para evitar juros.\nResponda para negociar.\n\n_Whatsflow Finance_ 🧾`,
    track_source: "financeiro",
    track_id: `overdue_${Date.now()}`,
  }),

  pixCobranca: (name: string, value: string, pixKey: string, pixName: string) => ({
    text: `Olá ${name}! Segue o PIX para pagamento da sua fatura de *R$ ${value}*:`,
    pixType: "EVP" as const,
    pixKey,
    pixName,
    track_source: "cobranca_pix",
  }),

  welcomeMenu: (name: string) => ({
    type: "list" as const,
    text: `Olá *${name}*! 🌟\n\nSou o assistente do *Whatsflow Finance*. Como posso ajudar?`,
    footerText: "Whatsflow Finance",
    listButton: "Ver opções",
    choices: [
      {
        title: "💰 Financeiro",
        rows: [
          { id: "ver_fatura", title: "Ver minha fatura", description: "Consultar débitos e vencimentos" },
          { id: "segunda_via", title: "Segunda via", description: "Gerar boleto ou PIX" },
          { id: "historico", title: "Histórico de pagamentos" },
        ],
      },
      {
        title: "🛠️ Atendimento",
        rows: [
          { id: "falar_humano", title: "Falar com atendente" },
          { id: "negociacao", title: "Negociar débito" },
          { id: "encerrar", title: "Encerrar atendimento" },
        ],
      },
    ],
  }),
};
