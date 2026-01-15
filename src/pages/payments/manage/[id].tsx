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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency, formatDate } from "@/lib/masks";
import { paymentService } from "@/services/paymentService";
import { rentalService } from "@/services/rentalService";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { Camera, Trash2 } from "lucide-react";

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
  const [showReceipt, setShowReceipt] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    paidAmount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    paymentLocation: "",
    paymentCode: "",
    notes: "",
  });

  const [calculatedValues, setCalculatedValues] = useState({
    baseRent: 0,
    garageValue: 0,
    lateFee: 0,
    interest: 0,
    previousPartialPayments: 0,
    expectedAmount: 0,
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      loadData(id);
    }
  }, [id]);

  useEffect(() => {
    if (payment && rental && formData.paymentDate) {
      calculateValues();
    }
  }, [formData.paymentDate, payment, rental]);

  useEffect(() => {
    if (formData.paymentMethod === "Pix" && formData.paymentLocation) {
      generatePixCode();
    }
  }, [formData.paymentMethod, formData.paymentLocation, formData.paymentDate]);

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
      setAttachments(paymentData.attachments || []);

      const rentalData = await rentalService.getById(paymentData.rentalId);
      if (rentalData) {
        setRental(rentalData);

        const [propertyData, tenantData] = await Promise.all([
          propertyService.getById(rentalData.propertyId),
          tenantService.getById(rentalData.tenantId),
        ]);

        setProperty(propertyData);
        setTenant(tenantData);
      }

      setFormData({
        paymentDate: paymentData.paymentDate
          ? new Date(paymentData.paymentDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        paidAmount: paymentData.paidAmount > 0 ? formatCurrency(paymentData.paidAmount) : "",
        paymentMethod: paymentData.paymentMethod || "",
        paymentLocation: paymentData.paymentLocation || "",
        paymentCode: paymentData.paymentCode || "",
        notes: paymentData.notes || "",
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro", description: "Erro ao carregar dados do pagamento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = () => {
    if (!payment || !rental) return;

    const baseRent = rental.monthlyRent;
    const garageValue = rental.hasGarage ? rental.garageValue || 0 : 0;
    
    const totalPartialPayments = (payment.partialPayments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const dueDate = new Date(
      payment.referenceYear,
      payment.referenceMonth - 1,
      rental.paymentDay
    );
    const paymentDate = new Date(formData.paymentDate);
    const diffTime = paymentDate.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let lateFee = 0;
    let interest = 0;

    if (diffDays > 0) {
      lateFee = (baseRent + garageValue) * 0.02;
      interest = (baseRent + garageValue) * 0.001 * diffDays;
    }

    const expectedAmount = baseRent + garageValue + lateFee + interest - totalPartialPayments;

    setCalculatedValues({
      baseRent,
      garageValue,
      lateFee,
      interest,
      previousPartialPayments: totalPartialPayments,
      expectedAmount,
    });

    setFormData((prev) => ({
      ...prev,
      paidAmount: formatCurrency(expectedAmount),
    }));
  };

  const generatePixCode = () => {
    const day = new Date(formData.paymentDate).getDate().toString().padStart(2, "0");
    const code = `${day}XXXX${formData.paymentLocation}`;
    setFormData((prev) => ({ ...prev, paymentCode: code }));
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
            setAttachments((prev) => [...prev, ...newAttachments]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    try {
      const paidAmount = parseCurrency(formData.paidAmount);
      const expectedAmount = calculatedValues.expectedAmount;

      let newStatus: "paid" | "partial" | "pending" = "pending";
      const newPartialPayments = [...(payment.partialPayments || [])];

      if (paidAmount >= expectedAmount) {
        newStatus = "paid";
      } else if (paidAmount > 0) {
        newStatus = "partial";
        newPartialPayments.push({
          amount: paidAmount,
          date: formData.paymentDate,
          method: formData.paymentMethod,
        });
      }

      const paymentData: Payment = {
        ...payment,
        paymentDate: formData.paymentDate,
        paidAmount: paidAmount,
        lateFee: calculatedValues.lateFee,
        interest: calculatedValues.interest,
        paymentMethod: formData.paymentMethod,
        paymentLocation: formData.paymentLocation,
        paymentCode: formData.paymentCode,
        notes: formData.notes,
        status: newStatus,
        attachments: attachments,
        partialPayments: newPartialPayments,
      };

      await paymentService.update(paymentData);
      toast({ title: "Sucesso", description: "Pagamento registrado com sucesso!" });

      if (newStatus === "paid" && rental && property && tenant) {
        setShowReceipt(true);
      } else {
        router.push("/payments");
      }
    } catch (error) {
      console.error("Erro ao salvar pagamento:", error);
      toast({ title: "Erro", description: "Erro ao salvar pagamento", variant: "destructive" });
    }
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
                  <p className="text-slate-900">
                    {property.location} - {property.complement}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Inquilino:</p>
                  <p className="text-slate-900">{tenant.name}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Referência:</p>
                  <p className="text-slate-900">
                    {payment.referenceMonth.toString().padStart(2, "0")}/{payment.referenceYear}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-700">Composição dos Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-700">Aluguel:</span>
                  <span className="font-semibold">{formatCurrency(calculatedValues.baseRent)}</span>
                </div>
                {calculatedValues.garageValue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-700">Vaga de Garagem:</span>
                    <span className="font-semibold">
                      {formatCurrency(calculatedValues.garageValue)}
                    </span>
                  </div>
                )}
                {calculatedValues.lateFee > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Multa (2%):</span>
                    <span className="font-semibold">+{formatCurrency(calculatedValues.lateFee)}</span>
                  </div>
                )}
                {calculatedValues.interest > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Juros (0,1%/dia):</span>
                    <span className="font-semibold">
                      +{formatCurrency(calculatedValues.interest)}
                    </span>
                  </div>
                )}
                {calculatedValues.previousPartialPayments > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Pagamentos Parciais:</span>
                    <span className="font-semibold">
                      -{formatCurrency(calculatedValues.previousPartialPayments)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold text-slate-900">Valor Esperado:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(calculatedValues.expectedAmount)}
                  </span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paidAmount">Valor a Pagar *</Label>
                    <Input
                      id="paidAmount"
                      value={formData.paidAmount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        const formatted = formatCurrency(parseFloat(value) / 100);
                        setFormData((prev) => ({ ...prev, paidAmount: formatted }));
                      }}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Método de Pagamento *</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, paymentMethod: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.paymentMethod === "Pix" && (
                    <>
                      <div>
                        <Label htmlFor="paymentLocation">Local Pagamento *</Label>
                        <Select
                          value={formData.paymentLocation}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, paymentLocation: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o local" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CP">CP</SelectItem>
                            <SelectItem value="CD">CD</SelectItem>
                            <SelectItem value="CE">CE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="paymentCode">Código PIX</Label>
                        <Input
                          id="paymentCode"
                          value={formData.paymentCode}
                          readOnly
                          className="bg-slate-50"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
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
                      Anexar
                    </Button>
                  </div>

                  {attachments.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {attachments.map((attachment, index) => (
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
                            <Trash2 className="w-4 h-4" />
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