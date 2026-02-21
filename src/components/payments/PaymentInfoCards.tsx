import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, User } from "lucide-react";

interface PaymentInfoCardsProps {
  location: any;
  property: any;
  tenant: any;
}

export function PaymentInfoCards({ location, property, tenant }: PaymentInfoCardsProps) {
  // Função para formatar CPF
  const formatCPF = (cpf: string | null | undefined): string => {
    if (!cpf) return "Não informado";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Função para formatar telefone
  const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return "Não informado";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-4 w-4" />
            Informações do Imóvel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">Local:</span>
              <p className="text-foreground flex-1">{location?.name || "Não informado"}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">Compl:</span>
              <p className="text-foreground flex-1">{property?.complement || "Não informado"}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">Cidade:</span>
              <p className="text-foreground flex-1">{location?.city || "Não informado"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Informações do Locatário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">Nome:</span>
              <p className="text-foreground flex-1">{tenant?.name || "Não informado"}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">CPF:</span>
              <p className="text-foreground flex-1">{formatCPF(tenant?.cpf)}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">Tel:</span>
              <p className="text-foreground flex-1">{formatPhone(tenant?.phone)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}