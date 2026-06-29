import { env } from "./env.js";

const PRIVATE_IPV4_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
]);

function isPrivateHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (PRIVATE_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith(".local") || normalized.endsWith(".internal")) return true;
  if (normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function ensureSafeTargetUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid target URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https target URLs are allowed");
  }

  if (!env.ALLOW_PRIVATE_TARGETS && isPrivateHost(parsed.hostname)) {
    throw new Error("Target URL points to a private or local network host");
  }
}
