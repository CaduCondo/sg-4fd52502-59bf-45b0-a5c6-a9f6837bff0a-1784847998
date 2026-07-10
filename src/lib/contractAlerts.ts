import { differenceInMonths, differenceInDays, parseISO } from "date-fns";

export type ContractAlertLevel = "normal" | "warning" | "critical";

export interface ContractAlert {
  level: ContractAlertLevel;
  daysRemaining: number;
  monthsRemaining: number;
  message: string;
}

/**
 * Calcula o nível de alerta baseado na proximidade do fim do contrato
 * @param endDate Data de término do contrato (string ISO ou Date)
 * @returns ContractAlert com nível, dias restantes e mensagem
 */
export function calculateContractAlert(endDate: string | Date | null | undefined): ContractAlert {
  if (!endDate) {
    return {
      level: "normal",
      daysRemaining: Infinity,
      monthsRemaining: Infinity,
      message: "Contrato sem data de término",
    };
  }

  try {
    const end = typeof endDate === "string" ? parseISO(endDate) : endDate;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // ✅ Garantir comparação apenas de data, sem hora
    
    const daysRemaining = differenceInDays(end, now);
    const monthsRemaining = differenceInMonths(end, now);

    // 🔴 Vermelho CRÍTICO: <= 30 dias (incluindo vencidos)
    if (daysRemaining <= 30) {
      return {
        level: "critical",
        daysRemaining,
        monthsRemaining,
        message: daysRemaining < 0 
          ? "Contrato vencido" 
          : daysRemaining === 0
          ? "Vence hoje"
          : `Vence em ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""}`,
      };
    }

    // 🟡 Amarelo AVISO: 31-60 dias
    if (daysRemaining <= 60) {
      return {
        level: "warning",
        daysRemaining,
        monthsRemaining,
        message: `Vence em ${Math.ceil(daysRemaining / 30)} ${Math.ceil(daysRemaining / 30) === 1 ? "mês" : "meses"}`,
      };
    }

    // ✅ Verde/Normal: > 60 dias
    return {
      level: "normal",
      daysRemaining,
      monthsRemaining,
      message: "Contrato vigente",
    };
  } catch (error) {
    console.error("Error calculating contract alert:", error);
    return {
      level: "normal",
      daysRemaining: Infinity,
      monthsRemaining: Infinity,
      message: "Data inválida",
    };
  }
}

/**
 * Retorna classes CSS do Tailwind baseadas no nível de alerta
 */
export function getAlertClasses(level: ContractAlertLevel): string {
  switch (level) {
    case "critical":
      return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900";
    case "warning":
      return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900";
    case "normal":
    default:
      return "";
  }
}

/**
 * Retorna classes CSS para o badge de status baseadas no nível de alerta
 */
export function getAlertBadgeClasses(level: ContractAlertLevel): string {
  switch (level) {
    case "critical":
      return "bg-red-500 hover:bg-red-600 text-white";
    case "warning":
      return "bg-yellow-500 hover:bg-yellow-600 text-white";
    case "normal":
    default:
      return "bg-green-500 hover:bg-green-600 text-white";
  }
}