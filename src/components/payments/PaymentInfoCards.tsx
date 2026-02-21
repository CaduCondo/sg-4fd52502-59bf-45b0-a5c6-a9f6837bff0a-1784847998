import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, User } from "lucide-react";

interface PaymentInfoCardsProps {
  location: any;
  property: any;
  tenant: any;
}

export function PaymentInfoCards({ location, property, tenant }: PaymentInfoCardsProps) {
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
              <p className="text-foreground flex-1">{location?.name}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">Compl:</span>
              <p className="text-foreground flex-1">{property?.complement}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">Cidade:</span>
              <p className="text-foreground flex-1">{location?.city}</p>
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
              <p className="text-foreground flex-1">{tenant?.name}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">CPF:</span>
              <p className="text-foreground flex-1">{tenant?.cpf}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[80px]">Tel:</span>
              <p className="text-foreground flex-1">{tenant?.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}