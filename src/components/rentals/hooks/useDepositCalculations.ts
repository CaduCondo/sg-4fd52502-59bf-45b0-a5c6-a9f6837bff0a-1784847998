import { useMemo } from "react";
import { parseCurrencyToNumber } from "@/lib/masks";

interface DepositData {
  securityDeposit: string;
  isDepositInstallment: boolean;
  depositInstallmentCount: string;
  depositInstallment2: string;
  depositInstallment3: string;
}

export function useDepositCalculations(depositData: DepositData) {
  const totalDeposit = useMemo(() => {
    let total = 0;

    if (depositData.securityDeposit) {
      total += parseCurrencyToNumber(depositData.securityDeposit);
    }

    if (depositData.isDepositInstallment && depositData.depositInstallmentCount) {
      const installmentCount = parseInt(depositData.depositInstallmentCount);

      if (installmentCount >= 2 && depositData.depositInstallment2) {
        total += parseCurrencyToNumber(depositData.depositInstallment2);
      }

      if (installmentCount === 3 && depositData.depositInstallment3) {
        total += parseCurrencyToNumber(depositData.depositInstallment3);
      }
    }

    return total;
  }, [
    depositData.securityDeposit,
    depositData.isDepositInstallment,
    depositData.depositInstallmentCount,
    depositData.depositInstallment2,
    depositData.depositInstallment3,
  ]);

  return { totalDeposit };
}