import { createHash, randomBytes } from "node:crypto";

export function slugify(input: string, max = 60): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** Hash con sal para no guardar IPs en claro. */
export function hashIp(ip: string, salt: string): string {
  return sha256(`${salt}:${ip}`).slice(0, 32);
}
