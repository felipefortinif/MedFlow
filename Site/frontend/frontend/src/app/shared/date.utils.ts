/**
 * Formata uma data no formato yyyy-mm-dd para exibição em pt-BR
 * Evita problemas de timezone ao interpretar a data como local
 * 
 * @param dateString Data no formato 'yyyy-mm-dd'
 * @param options Opções de formatação (padrão: { dateStyle: 'medium' })
 * @returns String formatada em pt-BR ou null se a data for inválida
 */
export function formatLocalDate(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string | null {
  if (!dateString) return null;
  
  try {
    // Parse date as local date to avoid timezone issues
    // dateString format: 'yyyy-mm-dd'
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Validate parsed values
    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    
    // Create local date (month is 0-indexed)
    const localDate = new Date(year, month - 1, day);
    
    // Verify the date is valid (catches invalid dates like Feb 30)
    if (
      localDate.getFullYear() !== year ||
      localDate.getMonth() !== month - 1 ||
      localDate.getDate() !== day
    ) {
      return null;
    }
    
    return new Intl.DateTimeFormat('pt-BR', options).format(localDate);
  } catch {
    return null;
  }
}

/**
 * Formata uma data Date object para exibição em pt-BR
 * 
 * @param date Objeto Date
 * @param options Opções de formatação
 * @returns String formatada em pt-BR
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
): string {
  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}
