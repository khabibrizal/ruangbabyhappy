/** "HH:MM" atau "HH:MM:SS" -> menit sejak tengah malam. */
export function toMinutes(hhmm: string): number {
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(3, 5));
  return h * 60 + m;
}
