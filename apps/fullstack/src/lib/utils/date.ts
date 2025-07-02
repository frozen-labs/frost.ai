export function calculatePeriodDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 7; // default
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInMs = end.getTime() - start.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  
  return diffInDays + 1; // Include both start and end dates
}