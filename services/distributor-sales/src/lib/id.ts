export function newId(prefix = "US"): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}
