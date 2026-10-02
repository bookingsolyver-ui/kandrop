/**
 * BASE TEXT of the legal pages (Portuguese). It is a template written to be reviewed and edited by the administrator
 * (and by a lawyer) before launch: every [bracketed item] is a placeholder to fill in.
 */
export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}
export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

const COMPANY = "[Nome legal da empresa], com sede em [morada], NIF [número]";

export const LEGAL: Record<"termos" | "privacidade" | "entregas", LegalDoc> = {
  termos: {
    title: "Termos e Condições",
    intro: `Estes termos regulam o uso da plataforma Kandrop, operada por ${COMPANY} (adiante, "Kandrop"), e as compras feitas nas lojas que nela funcionam.`,
    sections: [
      { heading: "1. Quem somos e o que fazemos", paragraphs: ["A Kandrop é uma plataforma de comércio eletrónico que permite a lojistas independentes vender produtos de fornecedores sem manterem stock. A Kandrop trata da recolha, da entrega e da cobrança do valor da encomenda."] },
      { heading: "2. Como comprar", paragraphs: ["Para comprar, o cliente escolhe o produto, preenche os seus dados e a morada de entrega e escolhe o dia de entrega entre os disponíveis. A encomenda fica registada quando a página de confirmação é apresentada. A Kandrop pode recusar ou cancelar uma encomenda quando os dados são incorretos, quando o produto deixou de estar disponível ou quando existe suspeita de fraude."] },
      { heading: "3. Preços e pagamento", paragraphs: ["Os preços são apresentados em Kwanzas (AOA). O pagamento é feito na entrega, diretamente ao estafeta, no momento em que o cliente recebe o produto. Um cupão de desconto só se aplica quando é válido para a loja e para o pedido em causa."] },
      { heading: "4. Entregas, trocas e devoluções", paragraphs: ["As condições de entrega, a garantia e o prazo de 4 dias para defeitos estão descritos na página Garantia, Entregas e Devoluções, que faz parte destes termos."] },
      { heading: "5. Contas de lojistas e fornecedores", paragraphs: ["Quem abre uma conta de lojista ou de fornecedor compromete-se a fornecer dados verdadeiros, a manter as credenciais em segurança e a não usar a plataforma para vender produtos ilegais, falsificados ou enganosos. A Kandrop pode suspender contas que violem estas regras. Os planos, preços e comissões aplicáveis são os apresentados na página de planos."] },
      { heading: "6. Responsabilidade", paragraphs: ["A Kandrop esforça-se por manter a plataforma disponível e as informações corretas, mas não garante que o serviço seja ininterrupto ou isento de erros. Na medida permitida pela lei, a responsabilidade da Kandrop limita-se ao valor da encomenda em causa."] },
      { heading: "7. Propriedade intelectual", paragraphs: ["A marca, o desenho e o código da plataforma pertencem à Kandrop. As imagens e os textos dos produtos pertencem aos respetivos fornecedores e lojistas."] },
      { heading: "8. Alterações e lei aplicável", paragraphs: ["Estes termos podem ser atualizados; a versão em vigor é sempre a publicada nesta página. Aplica-se a legislação da República de Angola, sendo competentes os tribunais de [comarca]."] },
      { heading: "9. Contactos", paragraphs: ["Para qualquer questão sobre estes termos, contacte-nos em [e-mail de contacto] ou pelo WhatsApp [número]."] },
    ],
  },
  privacidade: {
    title: "Política de Privacidade",
    intro: `Esta política explica que dados pessoais recolhemos, para que os usamos e quais são os seus direitos. O responsável pelo tratamento é ${COMPANY}.`,
    sections: [
      { heading: "1. Dados que recolhemos", list: ["Dados de compra: nome, e-mail, telefone ou WhatsApp, morada de entrega e dia de entrega pedido.", "Dados de contas de lojistas e fornecedores: nome, e-mail, telefone, dados da empresa e dados bancários para pagamentos.", "Dados técnicos: endereço IP, tipo de dispositivo e páginas visitadas, recolhidos por cookies e ferramentas de medição."] },
      { heading: "2. Para que usamos os dados", list: ["Processar, preparar e entregar as encomendas e contactar o cliente sobre a entrega.", "Enviar e-mails transacionais, como a confirmação da encomenda.", "Pagar a lojistas e fornecedores e cumprir obrigações legais e fiscais.", "Prevenir fraude e manter a segurança da plataforma.", "Medir e melhorar a publicidade e o desempenho do site."] },
      { heading: "3. Com quem partilhamos", paragraphs: ["Partilhamos os dados estritamente necessários com os parceiros que tornam o serviço possível: o lojista a quem a compra pertence, o fornecedor e os estafetas que entregam a encomenda, e prestadores de serviços técnicos (alojamento, base de dados e envio de e-mail). Não vendemos dados pessoais."] },
      { heading: "4. Cookies e publicidade", paragraphs: ["O site usa cookies essenciais ao funcionamento e ferramentas de medição de publicidade, como o Meta Pixel (Facebook e Instagram), usadas pela Kandrop e pelos lojistas nas suas páginas de venda para medir e otimizar anúncios. Estas ferramentas não são carregadas nos painéis internos da plataforma."] },
      { heading: "5. Segurança e conservação", paragraphs: ["Protegemos os dados com ligações cifradas, controlo de acessos e cifragem de dados sensíveis, como números de conta. Conservamos os dados pelo tempo necessário para as finalidades acima e para cumprir obrigações legais."] },
      { heading: "6. Os seus direitos", paragraphs: ["Pode pedir o acesso, a retificação ou a eliminação dos seus dados, opor-se a certos tratamentos e retirar o consentimento, nos termos da legislação angolana de proteção de dados pessoais. Para exercer estes direitos, contacte-nos em [e-mail de privacidade]."] },
      { heading: "7. Alterações", paragraphs: ["Podemos atualizar esta política; a versão em vigor é sempre a publicada nesta página."] },
    ],
  },
  entregas: {
    title: "Garantia, Entregas e Devoluções",
    intro: "Esta página explica como entregamos, como se paga e o que fazer se o produto chegar com um problema.",
    sections: [
      { heading: "1. Onde e quando entregamos", paragraphs: ["Entregamos em Luanda e no Bengo, de segunda-feira a sábado. Não fazemos entregas aos domingos. No momento da compra o cliente escolhe o dia de entrega entre os disponíveis. A entrega faz-se, em regra, em 24 horas úteis para as encomendas feitas antes da hora limite indicada na página do produto; as restantes seguem o prazo de 24 a 48 horas úteis."] },
      { heading: "2. Pagamento na entrega", paragraphs: ["Não é pedido nenhum pagamento antecipado. O cliente paga o valor total da encomenda diretamente ao estafeta, no momento em que recebe o produto. Antes de pagar, deve verificar que o produto corresponde ao que encomendou."] },
      { heading: "3. Contacto do estafeta", paragraphs: ["O estafeta contacta o cliente por chamada ou WhatsApp, usando o telefone indicado na encomenda, para combinar a entrega. Se não for possível contactar o cliente ou ninguém receber a encomenda, a entrega pode ser reagendada."] },
      { heading: "4. Garantia e janela de 4 dias para defeitos", paragraphs: ["O cliente tem 4 dias, a contar da data de entrega, para comunicar que o produto chegou com defeito ou diferente do anunciado. Para isso, deve contactar-nos dentro do prazo, indicando o número da encomenda e, sempre que possível, enviando fotografias do problema."] },
      { heading: "5. Trocas e devoluções", paragraphs: ["Confirmado o defeito ou a diferença em relação ao anunciado, procedemos à troca do produto ou, quando não for possível, à devolução do valor pago, de acordo com o que for acordado com o cliente. O produto deve ser devolvido nas condições em que foi recebido."] },
      { heading: "6. Como nos contactar", paragraphs: ["Pode contactar-nos em [e-mail de contacto] ou pelo WhatsApp [número], indicando sempre o número da encomenda."] },
    ],
  },
};
