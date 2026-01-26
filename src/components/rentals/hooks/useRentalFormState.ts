import { useState, useCallback, useEffect } from "react";
import type { RentalFormData } from "../types/rentalForm.types";
import type { Rental } from "@/types";

export function useRentalFormState(rental?: Rental) {
  const [formData, setFormData] = useState<Partial<RentalFormData>>({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    rentAmount: "",
    paymentDay: "",
    securityDeposit: "",
    isDepositInstallment: false,
    depositInstallmentCount: "",
    depositInstallment2: "",
    depositInstallment3: "",
    depositPaymentDate: "",
    depositPixCode: "",
    depositInstallment2PaymentDate: "",
    depositInstallment3PaymentDate: "",
    agencyCommissionPercentage: "",
    realEstateAgentCommissionPercentage: "",
    water: "",
    electricity: "",
    gas: "",
    waterResponsibility: "landlord",
    electricityResponsibility: "landlord",
    gasResponsibility: "landlord",
    contractFile: null,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RentalFormData, string>>>({});

  // Load rental data when editing
  useEffect(() => {
    if (rental) {
      setFormData({
        propertyId: rental.propertyId || "",
        tenantId: rental.tenantId || "",
        startDate: rental.startDate || "",
        endDate: rental.endDate || "",
        rentAmount: rental.rentAmount?.toString() || "",
        paymentDay: rental.paymentDay?.toString() || "",
        securityDeposit: rental.securityDeposit?.toString() || "",
        isDepositInstallment: rental.depositInstallments ? rental.depositInstallments > 1 : false,
        depositInstallmentCount: rental.depositInstallments?.toString() || "",
        depositInstallment2: rental.depositInstallment2?.toString() || "",
        depositInstallment3: rental.depositInstallment3?.toString() || "",
        depositPaymentDate: rental.depositPaymentDate || "",
        depositPixCode: rental.depositPixCode || "",
        depositInstallment2PaymentDate: rental.depositInstallment2PaymentDate || "",
        depositInstallment3PaymentDate: rental.depositInstallment3PaymentDate || "",
        agencyCommissionPercentage: rental.agencyCommissionPercentage?.toString() || "",
        realEstateAgentCommissionPercentage: rental.realEstateAgentCommissionPercentage?.toString() || "",
        water: rental.water?.toString() || "",
        electricity: rental.electricity?.toString() || "",
        gas: rental.gas?.toString() || "",
        waterResponsibility: rental.waterResponsibility || "landlord",
        electricityResponsibility: rental.electricityResponsibility || "landlord",
        gasResponsibility: rental.gasResponsibility || "landlord",
        contractFile: null,
      });
    }
  }, [rental]);

  const handleFieldChange = useCallback((field: keyof RentalFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const resetForm = useCallback(() => {
    setFormData({
      propertyId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      rentAmount: "",
      paymentDay: "",
      securityDeposit: "",
      isDepositInstallment: false,
      depositInstallmentCount: "",
      depositInstallment2: "",
      depositInstallment3: "",
      depositPaymentDate: "",
      depositPixCode: "",
      depositInstallment2PaymentDate: "",
      depositInstallment3PaymentDate: "",
      agencyCommissionPercentage: "",
      realEstateAgentCommissionPercentage: "",
      water: "",
      electricity: "",
      gas: "",
      waterResponsibility: "landlord",
      electricityResponsibility: "landlord",
      gasResponsibility: "landlord",
      contractFile: null,
    });
    setErrors({});
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof RentalFormData, string>> = {};

    if (!formData.propertyId) newErrors.propertyId = "Selecione um imóvel";
    if (!formData.tenantId) newErrors.tenantId = "Selecione um inquilino";
    if (!formData.startDate) newErrors.startDate = "Data de início é obrigatória";
    if (!formData.rentAmount) newErrors.rentAmount = "Valor do aluguel é obrigatório";
    if (!formData.paymentDay) newErrors.paymentDay = "Dia de pagamento é obrigatório";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  return {
    formData,
    errors,
    handleFieldChange,
    resetForm,
    validateForm,
  };
}