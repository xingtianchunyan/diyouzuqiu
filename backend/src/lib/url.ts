import dns from 'dns/promises'
import { isIP } from 'net'

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  '[::1]',
  '169.254.169.254' // AWS/云厂商元数据地址
])

const BLOCKED_IP_PREFIXES = [
  '0.', // 0.0.0.0/8
  '10.', // 10.0.0.0/8
  '127.', // 127.0.0.0/8
  '169.254.', // 链路本地
  '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', // 172.16.0.0/12
  '192.168.', // 192.168.0.0/16
  '224.', '225.', '226.', '227.', '228.', '229.', '230.', '231.', '232.', '233.', '234.', '235.', '236.', '237.', '238.', '239.', // 多播
  '240.', '241.', '242.', '243.', '244.', '245.', '246.', '247.', '248.', '249.', '250.', '251.', '252.', '253.', '254.', '255.' // 保留/实验
]

function isBlockedIp(host: string): boolean {
  const lower = host.toLowerCase()
  if (BLOCKED_HOSTS.has(lower)) return true
  return BLOCKED_IP_PREFIXES.some(prefix => lower.startsWith(prefix))
}

/**
 * Resolve a hostname and ensure the resulting IP is not a private/reserved address.
 * This mitigates DNS rebinding attacks that point a public hostname to an internal IP.
 */
async function resolvesToPublicIp(hostname: string): Promise<boolean> {
  try {
    const { address } = await dns.lookup(hostname)
    return !isBlockedIp(address)
  } catch {
    return false
  }
}

/**
 * Validates that a URL is safe to fetch server-side.
 * - Only http/https protocols are allowed.
 * - Raw IPv4/IPv6 addresses are rejected (use hostnames).
 * - Hostnames are resolved and the resolved IP must be public.
 * - Well-known internal/metadata hosts are rejected.
 */
export async function isAllowedUrl(urlString: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    return false
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false
  }

  const host = parsed.hostname
  if (!host) return false

  // Reject any raw IP address (IPv4 or IPv6) to eliminate SSRF via numeric addresses.
  if (isIP(host) !== 0) return false

  if (BLOCKED_HOSTS.has(host.toLowerCase())) return false

  // Reject common internal/metadata domains.
  if (host === 'metadata.google.internal' || host.endsWith('.internal')) {
    return false
  }

  return resolvesToPublicIp(host)
}
