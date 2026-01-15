// Currency formatting
export const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === "string" ? parseFloat(value.replace(/[^\d,-]/g, "").replace(",", ".")) : value;
  
  // Handle null, undefined, or NaN
  if (value === null || value === undefined || isNaN(numValue)) return "R$ 0,00";
  
  return numValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."));
};

export const applyRealMask = (value: string): string => {
  if (!value) return "";
  
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, "");
  
  // Converte para número e formata
  const amount = parseFloat(numbers) / 100;
  
  if (isNaN(amount)) return "";
  
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const numberToWords = (value: number): string => {
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (value === 0) return "zero";
  if (value === 100) return "cem";

  let result = "";
  const integerPart = Math.floor(value);
  const decimalPart = Math.round((value - integerPart) * 100);

  // Processar parte inteira
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    if (thousands === 1) {
      result += "mil";
    } else {
      result += numberToWords(thousands) + " mil";
    }
    const remainder = integerPart % 1000;
    if (remainder > 0) {
      result += " " + (remainder < 100 ? "e " : "") + numberToWords(remainder);
    }
  } else {
    // Centenas
    if (integerPart >= 100) {
      result += hundreds[Math.floor(integerPart / 100)];
      const remainder = integerPart % 100;
      if (remainder > 0) {
        result += " e " + numberToWords(remainder);
      }
    } else if (integerPart >= 20) {
      // Dezenas
      result += tens[Math.floor(integerPart / 10)];
      const remainder = integerPart % 10;
      if (remainder > 0) {
        result += " e " + units[remainder];
      }
    } else if (integerPart >= 10) {
      // Teens
      result += teens[integerPart - 10];
    } else if (integerPart > 0) {
      // Unidades
      result += units[integerPart];
    }
  }

  result += integerPart === 1 ? " real" : " reais";

  // Processar parte decimal
  if (decimalPart > 0) {
    result += " e ";
    if (decimalPart >= 20) {
      result += tens[Math.floor(decimalPart / 10)];
      const remainder = decimalPart % 10;
      if (remainder > 0) {
        result += " e " + units[remainder];
      }
    } else if (decimalPart >= 10) {
      result += teens[decimalPart - 10];
    } else {
      result += units[decimalPart];
    }
    result += decimalPart === 1 ? " centavo" : " centavos";
  }

  return result;
};

// CPF formatting
export const applyCpfMask = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

// Phone formatting
export const applyPhoneMask = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

// CEP formatting
export const applyCepMask = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3})\d+?$/, "$1");
};

// CNPJ Mask
export const applyCnpjMask = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

// Date Formatting
export const formatDate = (date: string | Date): string => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
};

// Address fetch stub
export const fetchAddressByCEP = async (cep: string): Promise<any> => {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return data;
  } catch (error) {
    console.error("Error fetching CEP", error);
    return null;
  }
};

export const formatCurrencyInput = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  const amount = parseFloat(numbers) / 100;
  if (isNaN(amount)) return "";
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Helpers & Aliases
export const formatCPF = applyCpfMask;
export const formatCNPJ = applyCnpjMask;
export const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2")
    .substring(0, 15);
};

export const unformatCPF = (value: string) => value.replace(/\D/g, "");
export const unformatCNPJ = (value: string) => value.replace(/\D/g, "");
export const unformatPhone = (value: string) => value.replace(/\D/g, "");

// Compatibility aliases
export const maskCurrency = applyRealMask;
export const applyCurrencyMask = applyRealMask;
export const parseCurrencyToNumber = parseCurrency;
export const maskCEP = applyCepMask;
export const maskCPF = applyCpfMask;
export const maskPhone = applyPhoneMask;
export const maskCNPJ = applyCnpjMask;