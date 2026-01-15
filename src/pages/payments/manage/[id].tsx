import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, applyRealMask, parseCurrency, formatDate } from "@/lib/masks";
import { paymentService } from "@/services/paymentService";
import { rentalService } from "@/services/rentalService";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

export default function ManagePaymentPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [payment, setPayment] = useState<Payment | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [waiveFine, setWaiveFine] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const [formData, setFormData] = useState({
    paidAmount: "",
    paymentDate: "",
    paymentMethod: "",
    notes: "",
    attachments: [] as string[]
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      loadData(id);
    }
  }, [id]);

  useEffect(() => {
    if (payment && !waiveFine) {
      setFormData(prev => ({
        ...prev,
        paidAmount: formatCurrency(payment.expectedAmount)
      }));
    } else if (payment && waiveFine) {
      const adjustedAmount = payment.expectedAmount - (payment.fineAmount || 0) - (payment.interestAmount || 0);
      setFormData(prev => ({
        ...prev,
        paidAmount: formatCurrency(adjustedAmount)
      }));
    }
  }, [waiveFine, payment]);

  const loadData = async (paymentId: string) => {
    try {
      setLoading(true);
      const paymentData = await paymentService.getById(paymentId);
      if (!paymentData) {
        toast({ title: "Erro", description: "Pagamento não encontrado", variant: "destructive" });
        router.push("/payments");
        return;
      }

      setPayment(paymentData);

      const rentalData = await rentalService.getById(paymentData.rentalId);
      if (rentalData) {
        setRental(rentalData);

        const [propertyData, tenantData] = await Promise.all([
          propertyService.getById(rentalData.propertyId),
          tenantService.getById(rentalData.tenantId)
        ]);

        setProperty(propertyData);
        setTenant(tenantData);
      }

      setFormData({
        paidAmount: paymentData.paidAmount ? formatCurrency(paymentData.paidAmount) : formatCurrency(paymentData.expectedAmount),
        paymentDate: paymentData.paymentDate ? formatDate(paymentData.paymentDate) : "",
        paymentMethod: paymentData.paymentMethod || "",
        notes: paymentData.notes || "",
        attachments: paymentData.attachments || []
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro", description: "Erro ao carregar dados do pagamento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    try {
      const paidAmount = parseCurrency(formData.paidAmount);
      const updatedPayment: Payment = {
        ...payment,
        paidAmount,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        attachments: formData.attachments,
        status: paidAmount >= payment.expectedAmount ? "paid" : paidAmount > 0 ? "partial" : "pending"
      };

      await paymentService.update(updatedPayment);
      toast({ title: "Sucesso", description: "Pagamento registrado com sucesso!" });

      if (rental && property && tenant && updatedPayment.status === "paid") {
        setShowReceipt(true);
      } else {
        router.push("/payments");
      }
    } catch (error) {
      console.error("Erro ao salvar pagamento:", error);
      toast({ title: "Erro", description: "Erro ao salvar pagamento", variant: "destructive" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments: string[] = [];
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newAttachments.push(reader.result as string);
          if (newAttachments.length === files.length) {
            setFormData((prev) => ({
              ...prev,
              attachments: [...prev.attachments, ...newAttachments]
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    router.push("/payments");
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Registrar Pagamento - Sistema de Locações</title>
        </Head>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-slate-600">Carregando...</p>
          </div>
        </Layout>
      </>
    );
  }

  if (!payment || !rental || !property || !tenant) {
    return (
      <>
        <Head>
          <title>Erro - Sistema de Locações</title>
        </Head>
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <p className="text-slate-600">Dados não encontrados</p>
            <Button onClick={() => router.push("/payments")}>Voltar</Button>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Registrar Pagamento - Sistema de Locações</title>
      </Head>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Registrar Pagamento</h1>
            <Button variant="outline" onClick={() => router.push("/payments")}>
              Voltar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-emerald-700">Informações da Locação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-700">Imóvel:</p>
                  <p className="text-slate-900">{property.location} - {property.complement}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Inquilino:</p>
                  <p className="text-slate-900">{tenant.name}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Referência:</p>
                  <p className="text-slate-900">
                    {payment.referenceMonth}/{payment.referenceYear}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-700">Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-700">Valor Original:</span>
                  <span className="font-semibold">{formatCurrency(rental.monthlyRent)}</span>
                </div>
                {payment.fineAmount && payment.fineAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Multa:</span>
                    <span className="font-semibold">+{formatCurrency(payment.fineAmount)}</span>
                  </div>
                )}
                {payment.interestAmount && payment.interestAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Juros:</span>
                    <span className="font-semibold">+{formatCurrency(payment.interestAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold text-slate-900">Valor Esperado:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(payment.expectedAmount)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registrar Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {(payment.fineAmount || 0) > 0 && (
                  <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Checkbox
                      id="waiveFine"
                      checked={waiveFine}
                      onCheckedChange={(checked) => setWaiveFine(checked as boolean)}
                    />
                    <Label htmlFor="waiveFine" className="text-sm font-medium cursor-pointer">
                      Retirar Multa (remove multa e juros do valor a pagar)
                    </Label>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paidAmount">Valor a Pagar *</Label>
                    <Input
                      id="paidAmount"
                      value={formData.paidAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paidAmount: applyRealMask(e.target.value)
                        }))
                      }
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentDate">Data do Pagamento *</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                    <Input
                      id="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))
                      }
                      placeholder="PIX, TED, Dinheiro, etc."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Adicione observações sobre o pagamento..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Comprovantes de Pagamento</Label>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Adicionar Comprovante
                    </Button>
                  </div>

                  {formData.attachments.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {formData.attachments.map((attachment, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={attachment}
                            alt={`Anexo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => router.push("/payments")}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    Registrar Pagamento
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {showReceipt && rental && property && tenant && payment && (
          <PaymentReceipt
            isOpen={showReceipt}
            onClose={handleCloseReceipt}
            payment={payment}
            rental={rental}
            property={property}
            tenant={tenant}
          />
        )}
      </Layout>
    </>
  );
}