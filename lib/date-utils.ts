
/**
 * Format a date to dd/mm/yyyy format
 * @param date - Date string or Date object
 * @returns Formatted date string in dd/mm/yyyy format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return '';
  }
}
