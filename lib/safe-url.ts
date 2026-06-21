import dns from "node:dns/promises";
import net from "node:net";

// SSRF guard for admin-configurable URLs that the server fetches (e.g.
// leaderboard_api_url). Blocks non-https schemes and any host that resolves to
// a private / loopback / link-local / reserved address.

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (base: string, bits: number) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  };
  return (
    inRange("0.0.0.0", 8) ||      // "this" network
    inRange("10.0.0.0", 8) ||     // private
    inRange("100.64.0.0", 10) ||  // CGNAT
    inRange("127.0.0.0", 8) ||    // loopback
    inRange("169.254.0.0", 16) || // link-local (cloud metadata)
    inRange("172.16.0.0", 12) ||  // private
    inRange("192.0.0.0", 24) ||   // IETF protocol assignments
    inRange("192.168.0.0", 16) || // private
    inRange("198.18.0.0", 15) ||  // benchmarking
    inRange("224.0.0.0", 4) ||    // multicast
    inRange("240.0.0.0", 4)       // reserved
  );
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0]; // strip zone id
  if (addr === "::1" || addr === "::") return true;
  if (addr.startsWith("fe80")) return true;            // link-local
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique local
  // IPv4-mapped (::ffff:a.b.c.d)
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // not a valid IP literal -> treat as unsafe
}

/**
 * Synchronous format check — usable when saving admin config. Requires https
 * and rejects obvious private/loopback IP literals or localhost hostnames.
 * Does NOT resolve DNS (see assertPublicHttpsUrl for the fetch-time check).
 */
export function validateHttpsUrlFormat(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("올바른 URL 형식이 아닙니다.");
  }
  if (url.protocol !== "https:") {
    throw new Error("https:// URL만 허용됩니다.");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("내부 호스트는 허용되지 않습니다.");
  }
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error("사설/예약 IP 주소는 허용되지 않습니다.");
  }
  return url;
}

/**
 * Fetch-time guard: validates format AND resolves the hostname, rejecting if any
 * resolved address is private/reserved. Use immediately before server-side fetch.
 */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const url = validateHttpsUrlFormat(raw);
  const host = url.hostname;
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("사설/예약 IP 주소는 허용되지 않습니다.");
    return url;
  }
  const records = await dns.lookup(host, { all: true });
  if (records.length === 0) throw new Error("호스트를 확인할 수 없습니다.");
  for (const { address } of records) {
    if (isPrivateIp(address)) {
      throw new Error("호스트가 사설/예약 주소로 확인되었습니다.");
    }
  }
  return url;
}
