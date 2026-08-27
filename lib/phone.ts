/**
 * Normaliza um número de telefone para o formato internacional só-dígitos (com DDI) esperado
 * pela API de WhatsApp — ex.: "(11) 98888-7777" -> "5511988887777". Assume Brasil (DDI 55)
 * quando o número informado só tem DDD + número. Retorna null se não parecer um telefone válido.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Já tem DDI 55 + DDD (2) + número (8 ou 9 dígitos)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // DDD + número, sem DDI
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Outro DDI (número internacional) — mantém como está se tiver um tamanho plausível
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length === 13) {
    const ddd = digits.slice(2, 4);
    const first = digits.slice(4, 9);
    const second = digits.slice(9);
    return `+55 (${ddd}) ${first}-${second}`;
  }
  if (digits.startsWith("55") && digits.length === 12) {
    const ddd = digits.slice(2, 4);
    const first = digits.slice(4, 8);
    const second = digits.slice(8);
    return `+55 (${ddd}) ${first}-${second}`;
  }
  return `+${digits}`;
}
