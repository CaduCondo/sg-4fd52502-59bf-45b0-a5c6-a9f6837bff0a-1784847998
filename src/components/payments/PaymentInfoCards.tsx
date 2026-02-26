import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Home, DollarSign } from "lucide-react";

interface PaymentInfoCardsProps {
  tenant: any;
  property: any;
  rental: any;
}

const formatCPF = (cpf: string | null | undefined): string => {
  if (!cpf) return "Não informado";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatCNPJ = (cnpj: string | null | undefined): string => {
  if (!cnpj) return "Não informado";
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatDocument = (tenant: any): string => {
  // Priorizar document_type se existir
  if (tenant?.document_type === "cnpj") {
    return formatCNPJ(tenant?.document || tenant?.cpf);
  }
  
  if (tenant?.document_type === "cpf") {
    return formatCPF(tenant?.document || tenant?.cpf);
  }

  // Fallback: tentar detectar pelo tamanho
  const doc = tenant?.cpf || tenant?.document;
  if (!doc) return "Não informado";
  
  const cleaned = doc.replace(/\D/g, "");
  if (cleaned.length === 14) {
    return formatCNPJ(doc);
  }
  return formatCPF(doc);
};

const getDocumentLabel = (tenant: any): string => {
  if (tenant?.document_type === "cnpj") return "CNPJ:";
  return "CPF:";
};

const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return "Não informado";
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
};

// Função auxiliar para formatar data sem problema de fuso horário
const formatDateWithoutTimezone = (dateString: string | null | undefined): string => {
  if (!dateString) return "Não informado";
  
  // Extrai apenas a parte da data (YYYY-MM-DD) ignorando hora/timezone
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  
  // Retorna no formato DD/MM/YYYY
  return `${day}/${month}/${year}`;
};

export function PaymentInfoCards({ tenant, property, rental }: PaymentInfoCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Informações do Locatário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Nome</p>
            <p className="text-sm font-medium">{tenant?.name || "Não informado"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{getDocumentLabel(tenant)}</p>
            <p className="text-sm font-medium">{formatDocument(tenant)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="text-sm font-medium">{formatPhone(tenant?.phone)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Home className="h-4 w-4" />
            Informações do Imóvel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Local</p>
            <p className="text-sm font-medium">{property?.locations?.name || "Não informado"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Complemento</p>
            <p className="text-sm font-medium">{property?.complement || "Não informado"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cidade</p>
            <p className="text-sm font-medium">{property?.locations?.city || "Não informado"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Informações do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Aluguel Mensal</p>
            <p className="text-sm font-medium">
              R$ {(rental?.rent_value || 0).toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Período Contrato</p>
            <p className="text-sm font-medium">
              {rental?.start_date && rental?.end_date
                ? `${formatDateWithoutTimezone(rental.start_date)} - ${formatDateWithoutTimezone(rental.end_date)}`
                : "Não informado"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dia de Vencimento</p>
            <p className="text-sm font-medium">
              Dia {rental?.rent_due_day || "Não informado"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}