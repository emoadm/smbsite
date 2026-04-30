export function getClientIp(headers: Headers): string | null {
  const cf = headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;
  return null;
}

export function getSubnet(ip: string): string {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip;
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}
