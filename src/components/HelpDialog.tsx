import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpCircle } from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: "properties" | "tenants" | "rentals" | "payments" | "financial" | "settings";
}

const helpContent = {
  properties: {
    title: "Ajuda - Imóveis",
    sections: [
      {
        title: "Visão Geral",
        content: "A página Imóveis permite gerenciar todos os imóveis disponíveis para locação. Você pode cadastrar novos imóveis, visualizar, editar e excluir registros existentes."
      },
      {
        title: "Lista de Imóveis",
        items: [
          "**Status**: Indica se o imóvel está Disponível, Ocupado ou Indisponível",
          "**Endereço**: Mostra rua, número, bairro e cidade",
          "**Detalhes**: Quartos, banheiros, área (m²) e valor do aluguel",
          "**Ações**: Visualizar, Editar ou Excluir cada imóvel"
        ]
      },
      {
        title: "Cadastro de Novo Imóvel",
        items: [
          "**Nome/Identificação**: Nome ou apelido para identificar o imóvel (ex: 'Apto 101')",
          "**Tipo**: Casa, Apartamento, Sala Comercial, etc.",
          "**Endereço Completo**: CEP busca automaticamente rua, bairro, cidade e estado",
          "**Número e Complemento**: Número do imóvel e complemento (apto, bloco, etc.)",
          "**Quartos**: Quantidade de quartos",
          "**Banheiros**: Quantidade de banheiros",
          "**Área (m²)**: Área total do imóvel",
          "**Valor**: Valor mensal do aluguel (opcional durante cadastro)",
          "**Status**: Disponível (para locação), Ocupado (já locado) ou Indisponível (manutenção, reforma)",
          "**Móveis Planejados**: Marque se o imóvel possui móveis planejados",
          "**Aceita Pets**: Marque se o imóvel aceita animais de estimação",
          "**Vaga Garagem**: Marque se o imóvel possui vaga de garagem",
          "**Descrição**: Informações adicionais sobre o imóvel",
          "**Fotos**: Adicione fotos do imóvel (pode tirar foto pela câmera ou escolher do dispositivo)"
        ]
      },
      {
        title: "Regras Importantes",
        items: [
          "✅ Imóveis com status **Ocupado** não aparecem na busca pública",
          "✅ Ao criar uma locação, o sistema automaticamente muda o status do imóvel para **Ocupado**",
          "✅ Ao encerrar uma locação, você escolhe o novo status do imóvel",
          "✅ O **CEP** busca automaticamente o endereço - preencha primeiro!",
          "✅ Fotos ajudam na divulgação do imóvel"
        ]
      }
    ]
  },
  tenants: {
    title: "Ajuda - Inquilinos",
    sections: [
      {
        title: "Visão Geral",
        content: "A página Inquilinos permite gerenciar os inquilinos (locatários). Cadastre novos inquilinos, visualize dados e acompanhe o status de cada um."
      },
      {
        title: "Lista de Inquilinos",
        items: [
          "**Nome**: Nome completo do inquilino (ou Nome Fantasia se for empresa)",
          "**CPF/CNPJ**: Documento de identificação",
          "**Telefone**: Telefone de contato",
          "**Status**: Novo (cadastrado, sem locação), Locatário (com locação ativa) ou Inativo",
          "**Ações**: Visualizar, Editar ou Excluir cada inquilino"
        ]
      },
      {
        title: "Cadastro de Novo Inquilino",
        items: [
          "**CPF/CNPJ**: Escolha CPF (pessoa física) ou CNPJ (empresa)",
          "**Nome Completo** (CPF) ou **Nome Fantasia** (CNPJ): Nome do inquilino",
          "**RG**: Aparece apenas para CPF - documento de identidade (formato: 00.000.000-0)",
          "**CPF**: Formato obrigatório: 000.000.000-00 (11 dígitos)",
          "**CNPJ**: Formato obrigatório: 00.000.000/0000-00 (14 dígitos)",
          "**Telefone**: Telefone de contato com DDD (formato: (00) 00000-0000)",
          "**E-mail**: E-mail válido para contato",
          "**Profissão**: Profissão ou ocupação do inquilino",
          "**Estado Civil**: Solteiro(a), Casado(a), Divorciado(a), Viúvo(a) ou União Estável",
          "**Renda Mensal**: Renda mensal comprovada (formato: R$ 0,00)",
          "**CEP**: Busca automaticamente o endereço",
          "**Endereço Completo**: Rua, número, complemento, bairro, cidade e estado"
        ]
      },
      {
        title: "Regras Importantes",
        items: [
          "✅ **CPF/CNPJ** deve ter formato válido - o sistema valida a quantidade de dígitos",
          "✅ **RG** só aparece quando CPF está selecionado",
          "✅ Quando seleciona **CNPJ**, o campo muda para **Nome Fantasia**",
          "✅ O **Status** é atualizado automaticamente: **Novo** → **Locatário** (quando cria locação) → **Inativo** (quando encerra locação)",
          "✅ Não é possível excluir inquilinos com locações ativas"
        ]
      }
    ]
  },
  rentals: {
    title: "Ajuda - Locações",
    sections: [
      {
        title: "Visão Geral",
        content: "A página Locações gerencia os contratos de locação. Vincule imóveis a inquilinos, defina valores, datas e acompanhe o status dos contratos."
      },
      {
        title: "Lista de Locações",
        items: [
          "**Imóvel**: Nome/identificação do imóvel locado",
          "**Inquilino**: Nome do inquilino",
          "**Início/Fim**: Período do contrato",
          "**Valor**: Valor mensal do aluguel",
          "**Status**: Ativa, Encerrada ou Expirada",
          "**Ações**: Visualizar, Editar, Ver Recebimentos ou Encerrar contrato"
        ]
      },
      {
        title: "Cadastro de Nova Locação",
        items: [
          "**Imóvel**: Selecione o imóvel (apenas imóveis Disponíveis aparecem)",
          "**Inquilino**: Selecione o inquilino",
          "**Data Início**: Data de início do contrato",
          "**Data Fim**: Data de término do contrato",
          "**Dia Vencimento**: Dia do mês para vencimento do aluguel (1 a 31)",
          "**Vaga Garagem?**: Marque se a locação inclui vaga de garagem. Campo valor aparece ao lado",
          "**Valor Aluguel**: Valor mensal do aluguel (sem caução e taxas)",
          "**Taxa Administração**: Taxa cobrada pela administração (% ou valor fixo)",
          "**Valor Caução**: Depósito caução (pode ser à vista ou parcelado)",
          "**Parcelas Caução**: Escolha À Vista, 2x ou 3x",
          "**Data Pagamento**: Data de pagamento da 1ª parcela (ou parcela única)",
          "**Código PIX**: Código PIX para pagamento do caução",
          "**Observações**: Informações adicionais sobre o contrato",
          "**Anexos**: Anexe documentos do contrato (pode tirar foto ou escolher arquivo)"
        ]
      },
      {
        title: "Caução (Depósito Garantia)",
        items: [
          "**À Vista**: Pago em uma única parcela na data especificada",
          "**2 Parcelas**: Primeira parcela na data especificada + segunda parcela com data de vencimento própria",
          "**3 Parcelas**: Primeira parcela + segunda e terceira com datas próprias",
          "**Botão Recebimento**: Clique para registrar o pagamento de cada parcela do caução",
          "**Código PIX**: Pode ser diferente para cada parcela"
        ]
      },
      {
        title: "Regras Importantes",
        items: [
          "✅ Ao criar a locação, o sistema **automaticamente**:",
          "  - Muda o status do imóvel para **Ocupado**",
          "  - Muda o status do inquilino para **Locatário**",
          "  - Cria os recebimentos mensais de aluguel",
          "✅ **Dia Vencimento** deve ser compatível com a **Data Início** (ex: início dia 10 → vencimento dia 10)",
          "✅ **Caução** pode ser pago em até 3 parcelas - a 1ª parcela é sempre paga no início do contrato",
          "✅ **Taxa Administração** é calculada sobre o valor do aluguel",
          "✅ Não é possível editar uma locação após criação - apenas visualizar e registrar recebimentos",
          "✅ Para **encerrar** o contrato, use o botão específico na visualização da locação"
        ]
      }
    ]
  },
  payments: {
    title: "Ajuda - Recebimentos",
    sections: [
      {
        title: "Visão Geral",
        content: "A página Recebimentos exibe todos os pagamentos mensais de aluguel. Registre pagamentos, acompanhe atrasos, visualize comissões e emita recibos."
      },
      {
        title: "Lista de Recebimentos",
        items: [
          "**Referência**: Mês/ano do pagamento (ex: Jan/2026)",
          "**Imóvel**: Nome do imóvel",
          "**Inquilino**: Nome do inquilino",
          "**Vencimento**: Data de vencimento do aluguel",
          "**Valor**: Valor do aluguel mensal",
          "**Status**: Pago (verde), Pendente (amarelo) ou Atrasado (vermelho)",
          "**Ações**: Visualizar ou Registrar Pagamento"
        ]
      },
      {
        title: "Registrar Recebimento",
        items: [
          "**Informações do Contrato**: Exibe imóvel, inquilino, período da locação",
          "**Formação de Valores**: Mostra como é calculado o valor total:",
          "  - **Aluguel**: Valor base mensal",
          "  - **Vaga Garagem**: Se houver",
          "  - **Taxa Adm**: Taxa de administração",
          "  - **Desconto**: Se aplicado",
          "  - **Atraso** (se houver): Multa (2%) + Juros diários (1% ao mês pro-rata)",
          "**Data Pagamento**: Data em que o pagamento foi recebido",
          "**Método Pagamento**: PIX, Dinheiro, Transferência ou Boleto",
          "**Código PIX**: Código PIX usado no pagamento (se aplicável)",
          "**Observações**: Anotações sobre o pagamento",
          "**Anexos**: Comprovantes e documentos (pode tirar foto ou escolher arquivo)"
        ]
      },
      {
        title: "Cálculo de Atraso",
        items: [
          "**Multa**: 2% sobre o valor total (aluguel + garagem + taxa adm - desconto)",
          "**Juros**: 1% ao mês calculado por dia (juros ao mês / 30 * dias de atraso)",
          "**Exemplo**: Aluguel R$ 1.000 com 15 dias de atraso:",
          "  - Multa: R$ 20,00 (2%)",
          "  - Juros: R$ 5,00 (1% / 30 dias * 15 dias = 0,5%)",
          "  - Total: R$ 1.025,00"
        ]
      },
      {
        title: "Regras Importantes",
        items: [
          "✅ Ao registrar pagamento, o status muda de **Pendente/Atrasado** para **Pago**",
          "✅ **Atraso** é calculado automaticamente se Data Pagamento > Data Vencimento",
          "✅ Você pode aplicar **desconto** sobre o valor total",
          "✅ **Observações** são opcionais - use para anotações importantes",
          "✅ **Comprovantes anexados** ficam salvos permanentemente",
          "✅ Após salvar, você pode emitir o **Recibo** em PDF"
        ]
      }
    ]
  },
  financial: {
    title: "Ajuda - Financeiro",
    sections: [
      {
        title: "Visão Geral",
        content: "A página Financeiro consolida todos os dados financeiros do sistema. Visualize receitas, comissões, aluguéis, cauções e acompanhe a saúde financeira da sua gestão de imóveis."
      },
      {
        title: "Abas Disponíveis",
        items: [
          "**Aluguel**: Recebimentos mensais de aluguel",
          "**Caução**: Pagamentos de caução (depósito garantia)",
          "**Resumo**: Visão geral consolidada de receitas e comissões"
        ]
      },
      {
        title: "Aba Aluguel",
        items: [
          "**Período**: Selecione Mês, Trimestre, Semestre ou Ano",
          "**Filtros**: Filtre por imóvel, inquilino, status ou data",
          "**Colunas**:",
          "  - **Mês/Ano**: Referência do pagamento",
          "  - **Imóvel**: Nome do imóvel",
          "  - **Inquilino**: Nome do inquilino",
          "  - **Vencimento**: Data de vencimento",
          "  - **Pagamento**: Data de pagamento efetivo",
          "  - **Valor Base**: Aluguel + garagem + taxa adm",
          "  - **Desconto**: Se aplicado",
          "  - **Atraso**: Multa + juros",
          "  - **Total Pago**: Valor efetivamente recebido",
          "  - **Status**: Pago/Pendente/Atrasado",
          "**Totalizadores**: Soma de todos os valores do período filtrado"
        ]
      },
      {
        title: "Aba Caução",
        items: [
          "**Lista de Cauções**: Exibe todas as parcelas de caução de todas as locações",
          "**Colunas**:",
          "  - **Locação**: Referência da locação (imóvel + inquilino)",
          "  - **Parcela**: Número da parcela (1/1, 1/2, 2/2, 1/3, 2/3, 3/3)",
          "  - **Valor**: Valor da parcela",
          "  - **Vencimento**: Data prevista para pagamento",
          "  - **Pagamento**: Data de pagamento efetivo",
          "  - **Código PIX**: Código PIX usado",
          "  - **Status**: Pago ou Pendente",
          "**Filtros**: Filtre por imóvel, inquilino ou status",
          "**Total**: Soma de todos os cauções do período"
        ]
      },
      {
        title: "Aba Resumo",
        items: [
          "**Receita Total**: Soma de todos os aluguéis pagos no período",
          "**Comissão Parceiro**: Comissão devida aos parceiros externos",
          "**Comissão Interna**: Comissão devida à equipe interna",
          "**Gráficos**: Visualização gráfica das receitas e comissões",
          "**Filtros de Período**: Ajuste o período para ver diferentes análises"
        ]
      },
      {
        title: "Regras Importantes",
        items: [
          "✅ **Valores em vermelho** indicam atraso no pagamento",
          "✅ **Valores em verde** indicam pagamento em dia",
          "✅ Os totalizadores somam **apenas** os registros visíveis após aplicar filtros",
          "✅ **Comissões** são calculadas automaticamente conforme configurações do sistema",
          "✅ Use os **filtros** para análises específicas (por imóvel, inquilino, período)",
          "✅ **Exporte** os dados para Excel para análises externas"
        ]
      }
    ]
  },
  settings: {
    title: "Ajuda - Configurações",
    sections: [
      {
        title: "Visão Geral",
        content: "A página Configurações permite gerenciar usuários, permissões, isenções e configurações gerais do sistema."
      },
      {
        title: "Aba Usuários",
        items: [
          "**Lista de Usuários**: Todos os usuários com acesso ao sistema",
          "**Adicionar Usuário**: Cadastre novos usuários",
          "**Colunas**:",
          "  - **Nome**: Nome completo do usuário",
          "  - **E-mail**: E-mail de acesso",
          "  - **Perfil**: Admin, Financeiro ou Gestão",
          "  - **Status**: Ativo ou Inativo",
          "**Editar Usuário**: Altere nome, e-mail, perfil ou status",
          "**Excluir Usuário**: Remove o acesso do usuário"
        ]
      },
      {
        title: "Perfis de Acesso",
        items: [
          "**Admin**: Acesso total ao sistema - pode ver e fazer tudo",
          "**Financeiro**: Acesso a Recebimentos, Financeiro e visualização de Locações/Imóveis/Inquilinos",
          "**Gestão**: Acesso a Imóveis, Inquilinos, Locações e visualização de Recebimentos"
        ]
      },
      {
        title: "Aba Permissões",
        items: [
          "**Gerenciamento de Permissões**: Configure permissões específicas por perfil e funcionalidade",
          "**Níveis de Permissão**:",
          "  - **Visualizar**: Apenas ver os dados",
          "  - **Criar**: Criar novos registros",
          "  - **Editar**: Modificar registros existentes",
          "  - **Excluir**: Remover registros"
        ]
      },
      {
        title: "Isenções de Taxa",
        items: [
          "**Isenção de Taxa de Administração**: Configure imóveis/inquilinos isentos da taxa de administração",
          "**Tipos de Isenção**:",
          "  - **Por Imóvel**: Imóvel específico não paga taxa",
          "  - **Por Inquilino**: Inquilino específico não paga taxa",
          "**Aplicação**: A isenção é aplicada automaticamente nos cálculos dos recebimentos"
        ]
      },
      {
        title: "Regras Importantes",
        items: [
          "✅ Apenas usuários **Admin** podem acessar Configurações",
          "✅ **Não é possível excluir o próprio usuário** enquanto logado",
          "✅ Ao alterar permissões, o usuário precisa **fazer login novamente** para atualizar",
          "✅ **Isenções de taxa** afetam apenas recebimentos futuros - não alteram pagamentos já registrados"
        ]
      }
    ]
  }
};

export function HelpDialog({ open, onOpenChange, page }: HelpDialogProps) {
  const content = helpContent[page];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {content.title}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <div className="space-y-6">
            {content.sections.map((section, index) => (
              <div key={index} className="space-y-3">
                <h3 className="text-lg font-semibold text-primary">{section.title}</h3>
                
                {section.content && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {section.content}
                  </p>
                )}
                
                {section.items && (
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="text-sm leading-relaxed">
                        <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>') }} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}