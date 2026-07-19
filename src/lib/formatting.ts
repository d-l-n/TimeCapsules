export function fmtTime(m: number, t: { stats: { minutes: string; hours: string } }) {
  if (m < 60) return `${m}${t.stats.minutes}`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r > 0 ? `${h}${t.stats.hours} ${r}${t.stats.minutes}` : `${h}${t.stats.hours}`
}
