/** Format an ISO date or timestamp for the retained schedule detail. */
export function formatDotDate(dateString: string): string {
  return dateString.slice(0, 10).replace(/-/g, ".");
}
