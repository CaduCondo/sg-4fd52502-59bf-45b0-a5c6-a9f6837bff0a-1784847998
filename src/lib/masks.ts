export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export function maskCurrency(value: string): string {
  const numbers = value.replace(/\D/g, "");
  const amount = parseFloat(numbers) / 100;
  
  if (isNaN(amount)) return "R$ 0,00";
  
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
}

export function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
}

export function maskPhone(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
}

export function maskCEP(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3})\d+?$/, "$1");
}

export function applyCurrencyMask(value: string | number): string {
  if (!value) return "";
  
  const val = value.toString().replace(/\D/g, "");
  
  // Converter para número com 2 casas decimais
  const numberValue = parseInt(val) / 100;
  
  return numberValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  // Remove R$, espaços e pontos de milhar, substitui vírgula decimal por ponto
  const cleanValue = value.replace(/[R$\s.]/g, "").replace(",", ".");
  return parseFloat(cleanValue) || 0;
}

export async function fetchAddressByCEP(cep: string): Promise<{
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
} | null> {
  const cleanCEP = cep.replace(/\D/g, "");
  if (cleanCEP.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return data;
  } catch (error) {
    return null;
  }
}

export function numberToWords(value: number): string {
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  
  if (value === 0) return "zero";
  if (value === 100) return "cem";
  
  let result = "";
  const integerPart = Math.floor(value);
  const decimalPart = Math.round((value - integerPart) * 100);
  
  // Thousands
  const thousands = Math.floor(integerPart / 1000);
  if (thousands > 0) {
    if (thousands === 1) {
      result += "mil";
    } else {
      result += convertHundreds(thousands) + " mil";
    }
    if (integerPart % 1000 > 0) result += " e ";
  }
  
  // Hundreds, tens and units
  const remainder = integerPart % 1000;
  if (remainder > 0) {
    result += convertHundreds(remainder);
  }
  
  result += " reais";
  
  if (decimalPart > 0) {
    result += " e " + convertHundreds(decimalPart) + " centavos";
  }
  
  return result;
  
  function convertHundreds(n: number): string {
    let str = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    if (h > 0) {
      str += hundreds[h];
      if (t > 0 || u > 0) str += " e ";
    }
    
    if (t === 1) {
      str += teens[u];
    } else {
      if (t > 0) {
        str += tens[t];
        if (u > 0) str += " e ";
      }
      if (u > 0 && t !== 1) {
        str += units[u];
      }
    }
    
    return str;
  }
}