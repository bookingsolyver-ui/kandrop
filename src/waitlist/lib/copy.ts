/**
 * Todo o texto da página vive aqui — PRD Anexo A.
 * A marca é "Kandrop" (confirmado pelo responsável).
 */
export const BRAND = "Kandrop";

export const copy = {
  meta: {
    title: "Kandrop | Vende sem stock, com entrega em 24h em Luanda",
    description:
      "Junta-te à lista de espera da Kandrop. Preço de fornecedor chinês, entrega em 24h em Luanda e zero stock. Lançamento anunciado no Instagram @kandrop.ecom.",
  },

  nav: {
    cta: "Entrar na lista de espera",
    ctaMobile: "Lista de espera",
  },

  hero: {
    eyebrow: "KANDROP · LANÇAMENTO EM BREVE",
    titlePre: "A tua loja. O teu ",
    titleHighlight: "lucro",
    titlePost: ". Sem stock.",
    subtitle:
      "Vende produtos com preço de fornecedor chinês e o teu cliente recebe em Luanda no dia seguinte. Sem stock, sem importação, sem processos manuais.",
    cta: "Entrar na lista de espera",
    microtext: "Entrega em 24h em Luanda · Pagamento na entrega e Multicaixa Express",
    disclaimer: "24h só em Luanda",
    instagramNotice: "Data oficial será revelada no Instagram @kandrop.ecom",
  },

  problem: {
    title: "Importar demora. Comprar stock arrisca. Entregar tarde perde a venda.",
    body: "O cliente angolano compra por impulso e espera rápido. A Kandrop junta o que normalmente não anda junto: preço de origem e entrega imediata.",
  },

  benefits: {
    title: "A solução",
    items: [
      {
        icon: "tag",
        title: "Preço chinês",
        text: "Compras ao custo do fornecedor e ficas com uma margem que o mercado local não oferece.",
      },
      {
        icon: "truck",
        title: "Entrega em 24h",
        text: "O pedido entra, o produto sai e o cliente recebe em Luanda no dia seguinte.",
      },
      {
        icon: "box",
        title: "Zero stock",
        text: "Só compras quando vendes. Investimento inicial mínimo.",
      },
      {
        icon: "gear",
        title: "Operação automatizada",
        text: "Cada pedido segue para o fornecedor sem intervenção tua.",
      },
      {
        icon: "card",
        title: "Pagamento adaptado",
        text: "Pagamento na entrega e Multicaixa Express.",
      },
      {
        icon: "bank",
        title: "Levantamentos em 24h",
        text: "Pede o levantamento do teu saldo diretamente para a tua conta bancária angolana.",
      },
    ],
  },

  steps: {
    title: "Como funciona",
    eyebrow: "Simples e direto",
    subtitle:
      "Três etapas para colocar a tua loja a faturar com produtos físicos e entrega rápida em Luanda.",
    items: [
      { title: "Cria a tua conta", text: "Regista-te e liga a tua loja à plataforma." },
      { title: "Escolhe os produtos", text: "Importa do catálogo com o preço de fornecedor já definido." },
      { title: "Vende", text: "O cliente compra, o fornecedor envia e a entrega chega em 24h." },
    ],
    imageAlts: [
      "Empreendedor angolano a gerir a loja online em Luanda",
      "Produtos físicos de dropshipping prontos para envio",
      "Estafeta em Luanda a realizar entrega rápida de encomenda em 24h",
    ],
    /** Marcador de resultado mostrado junto a cada passo na linha do tempo. */
    outcomes: ["Loja ligada", "Preço de fornecedor", "Entrega em 24h"],
  },

  comparison: {
    title: "Kandrop vs. modelo tradicional",
    columns: ["Fator", "Modelo tradicional", "Kandrop"],
    rows: [
      ["Preço de compra", "Revenda local", "Preço de fornecedor chinês"],
      ["Prazo de entrega", "Semanas", "24h em Luanda"],
      ["Investimento em estoque", "Alto", "Zero"],
      ["Operação", "Manual", "Automatizada"],
    ],
  },

  audience: {
    title: "Para quem é",
    items: [
      "Quem quer vender online sem comprar stock",
      "Quem já vende e quer melhor margem e entrega mais rápida",
      "Quem está fora de Angola e quer atender o mercado de Luanda",
    ],
  },

  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "A entrega em 24h é para todo o país?",
        a: "A entrega em 24h é para Luanda. Para outras províncias, o prazo é comunicado no momento do pedido.",
      },
      {
        q: "Preciso de investir em stock?",
        a: "Não. Só compras ao fornecedor quando vendes.",
      },
      {
        q: "Como recebo o pagamento?",
        a: "Por pagamento na entrega ou Multicaixa Express.",
      },
      {
        q: "Preciso de conhecimentos técnicos?",
        a: "Não. A configuração é guiada.",
      },
      {
        q: "Quando abre a Kandrop?",
        a: "A contagem decrescente está a correr e a data oficial exata de abertura será revelada no nosso Instagram (@kandrop.ecom). Segue a nossa página oficial para acompanhares os bastidores e receberes o aviso em primeira mão!",
      },
      {
        q: "Custa alguma coisa entrar na lista?",
        a: "Não, entrar na lista de espera é 100% grátis e sem qualquer compromisso.",
      },
      {
        q: "O que fazem com os meus dados?",
        a: "Só os usamos para te avisar do lançamento e gerir os convites. Não vendemos os teus dados a terceiros.",
      },
    ],
  },

  finalCta: {
    title: "Vende mais barato. Entrega mais rápido. Fica com a margem. Entra na lista de espera.",
  },

  // FR-21 — textos do modo LAUNCH_MODE=launched ({brand} é substituído no componente)
  launched: {
    badge: "A {brand} já está aberta!",
    cta: "Aceder à {brand}",
    access: "Aceder ao marketplace",
  },

  form: {
    nameLabel: "O teu nome",
    namePlaceholder: "Como te chamas?",
    emailLabel: "Email",
    emailPlaceholder: "teu@email.com",
    phoneLabel: "WhatsApp",
    phonePlaceholder: "9XX XXX XXX",
    countryLabel: "País",
    profileLabel: "O teu perfil (opcional)",
    profileOptions: [
      { value: "start_selling", label: "Quero começar a vender" },
      { value: "already_selling", label: "Já vendo online ou offline" },
      { value: "abroad", label: "Estou fora de Angola" },
    ],
    consentPre: "Aceito que a Kandrop guarde o meu nome, WhatsApp e e-mail para me contactar sobre o lançamento. Li a",
    consentLink: "Política de Privacidade",
    submit: "Entrar na lista de espera",
    submitting: "A entrar…",
    // Mensagens do FR-13 (email é acréscimo do responsável, fora do PRD original)
    errors: {
      name: "Diz-nos o teu nome.",
      nameMax: "O nome pode ter no máximo 80 caracteres.",
      emailRequired: "Escreve o teu email.",
      emailInvalid: "Confirma o email: parece incompleto.",
      phoneAoLength: "Confirma o número: precisa de 9 dígitos.",
      phoneAoPrefix: "Confirma o número: os números de Angola começam por 9.",
      phoneInvalid: "Confirma o número e o indicativo.",
      consent: "Precisas de aceitar para entrares na lista.",
      network: "Algo falhou do nosso lado. Os teus dados não se perderam, tenta outra vez.",
      rateLimited: "Tentaste muitas vezes. Espera um pouco e tenta outra vez.",
      closed: "As inscrições estão encerradas de momento.",
    },
  },

  // FR-17, FR-19, FR-22, FR-25 — ecrã de sucesso e contador
  success: {
    title: "Já estás na lista! 🔥",
    positionPrefix: "És o número ",
    close: "Fechar ecrã de sucesso",
    shareLabel: "O teu link pessoal",
    copyLink: "Copiar link",
    copied: "Copiado!",
    whatsapp: "Partilhar no WhatsApp",
    nativeShare: "Partilhar…",
    whatsappText:
      "Entrei na lista de espera da {brand}: vende com preço de fornecedor chinês e entrega em 24h em Luanda, sem stock. Entra aqui:",
    progressTitle: "Os teus convites",
    progressOf: "{done} de {total} convites",
    invitesNote:
      "Só convites válidos contam: o convidado tem de concluir a inscrição com um número único. Auto-indicação não conta.",
    levels: [
      {
        at: 3,
        name: "Acesso antecipado",
        text: "Entras no primeiro lote de vendedores, antes da abertura geral.",
      },
      {
        at: 10,
        name: "Vendedor Fundador",
        text: "Selo de fundador na conta e prioridade no suporte ao arranque.",
      },
    ],
    achieved: "Conquistado ✓",
    cardNote: "Já estás na lista.",
    reopen: "Ver o meu link de partilha",
  },

  // FR-19 — contador público (só a partir de 50 inscritos)
  stats: {
    label: "pessoas na lista",
    ariaLabel: "{total} pessoas na lista de espera",
  },

  footer: {
    privacy: "Política de Privacidade",
  },

  privacy: {
    title: "Política de Privacidade",
    intro:
      "Aqui explicamos, sem letras pequenas, o que fazemos com os teus dados quando entras na lista de espera da Kandrop.",
    lastUpdated: "Última actualização: 30 de Setembro de 2026.",
    backLink: "← Voltar à página inicial",
    contactFallback: "O contacto para pedidos será indicado aqui em breve.",
    sections: [
      {
        id: "1",
        number: "1.",
        title: "Quem somos",
        content:
          "A Kandrop é uma plataforma de dropshipping que liga vendedores angolanos a fornecedores chineses. Somos os responsáveis pelos dados que nos deixas.",
      },
      {
        id: "2",
        number: "2.",
        title: "Que dados recolhemos",
        fillTitle: "O que tu preenches:",
        fillItems: [
          "O teu nome.",
          "O teu número de WhatsApp.",
          "O teu e-mail, se o deixares.",
          'O teu perfil (por exemplo, "Quero começar a vender"), se o escolheres.',
        ],
        generatedTitle: "O que geramos por ti:",
        generatedItems: [
          "O teu código e link pessoal de convite.",
          "A tua posição na lista.",
          "A data e a hora em que aceitaste esta política.",
        ],
        techTitle: "Dados técnicos:",
        techItems: [
          "O tipo de aparelho (telemóvel, computador ou tablet).",
          "O teu país, deduzido do indicativo do número.",
          "De onde vieste (por exemplo, Instagram ou o link de um amigo).",
        ],
        note: "Não pedimos palavras-passe, dados bancários nem documentos.",
      },
      {
        id: "3",
        number: "3.",
        title: "Para que usamos os teus dados",
        items: [
          "Para te avisar do lançamento oficial da plataforma.",
          "Para gerir a lista de espera e o teu acesso antecipado.",
          "Para contar os convites que fizeres e te dar as recompensas.",
          "Para perceber de onde vêm as inscrições e melhorar a página.",
        ],
        note: "Não usamos os teus dados para mais nada sem te perguntar antes.",
      },
      {
        id: "4",
        number: "4.",
        title: "Quem tem acesso",
        items: [
          "A equipa da Kandrop, com acesso limitado a quem precisa.",
          "Os serviços que usamos para fazer isto funcionar: Vercel (a página), n8n (a automação) e Google Sheets (a lista). Estes serviços podem guardar dados em servidores fora de Angola.",
          "Quem te convidou nunca vê os teus dados. Só fica a saber que o convite contou.",
        ],
        note: "Não vendemos nem alugamos os teus dados a ninguém.",
      },
      {
        id: "5",
        number: "5.",
        title: "Quanto tempo guardamos",
        content:
          "Até 6 meses depois do lançamento, ou até pedires a eliminação, o que acontecer primeiro.",
      },
      {
        id: "6",
        number: "6.",
        title: "Os teus direitos",
        intro: "Podes pedir-nos a qualquer momento para:",
        rights: [
          "ver os dados que temos sobre ti;",
          "corrigir o que estiver errado;",
          "eliminar os teus dados;",
          "opor-te a que os usemos.",
        ],
        howToPrefix: "Como pedir: envia um e-mail para ",
        howToSuffix:
          " com o teu nome e o número de WhatsApp com que te inscreveste. Se deixaste e-mail na inscrição, envia a partir desse mesmo e-mail. Podemos pedir-te informação adicional para confirmar que és tu antes de agirmos, para proteger os teus dados. Respondemos em até 7 dias úteis.",
      },
      {
        id: "7",
        number: "7.",
        title: "Como protegemos os teus dados",
        content:
          "A lista só é vista pela equipa, com acessos pessoais e verificação em dois passos. A ligação à página é cifrada (HTTPS).",
      },
      {
        id: "8",
        number: "8.",
        title: "O que guardamos no teu aparelho",
        content:
          "Guardamos no teu browser o teu código de convite, para te mostrar a tua posição quando voltares. Medimos as visitas de forma agregada, sem te identificar.",
      },
      {
        id: "9",
        number: "9.",
        title: "Lei aplicável",
        content:
          "Seguimos a Lei n.º 22/11 (Lei da Protecção de Dados Pessoais de Angola), supervisionada pela Agência de Protecção de Dados (APD). Se estás fora de Angola, podem aplicar-se também as leis do teu país, e podes contactar a autoridade de protecção de dados de lá.",
      },
      {
        id: "10",
        number: "10.",
        title: "Mudanças",
        content:
          "Se mudarmos alguma coisa importante, actualizamos esta página e a data no topo.",
      },
    ],
  },
} as const;