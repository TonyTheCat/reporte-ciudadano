import type { AstroCookies } from "astro";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { createHash, randomBytes } from "node:crypto";
import { config } from "./config";

export interface User {
  id: string;
  email: string;
  name?: string;
  groups: string[];
  isStaff: boolean; // admin o moderador
  role?: "admin" | "moderador";
}

const ID_COOKIE = "rc_id";
const REFRESH_COOKIE = "rc_refresh";
const PKCE_COOKIE = "rc_pkce";
const DEV_COOKIE = "rc_dev";

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;
function getVerifier() {
  const c = config.cognito;
  if (!c) return undefined;
  verifier ??= CognitoJwtVerifier.create({ userPoolId: c.userPoolId, clientId: c.clientId, tokenUse: "id" });
  return verifier;
}

function toUser(p: Record<string, any>): User {
  const groups: string[] = p["cognito:groups"] ?? [];
  const role = groups.includes("admin") ? "admin" : groups.includes("moderador") ? "moderador" : undefined;
  return { id: p.sub, email: p.email, name: p.name, groups, isStaff: !!role, role };
}

const cookieOpts = (maxAge: number) => ({
  path: "/",
  httpOnly: true,
  secure: !config.siteUrl.startsWith("http://localhost"),
  sameSite: "lax" as const,
  maxAge,
});

export async function getUser(cookies: AstroCookies): Promise<User | undefined> {
  if (config.devLogin) {
    const dev = cookies.get(DEV_COOKIE)?.value;
    if (dev) return toUser({ sub: `dev-${dev}`, email: `${dev}@localhost`, "cognito:groups": dev === "admin" ? ["admin"] : [] });
  }
  const v = getVerifier();
  if (!v) return undefined;
  const token = cookies.get(ID_COOKIE)?.value;
  if (token) {
    try {
      return toUser((await v.verify(token)) as any);
    } catch {
      /* vencido: se intenta refrescar */
    }
  }
  const refresh = cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return undefined;
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });
  if (!tokens?.id_token) {
    cookies.delete(REFRESH_COOKIE, { path: "/" });
    return undefined;
  }
  cookies.set(ID_COOKIE, tokens.id_token, cookieOpts(3600));
  try {
    return toUser((await v.verify(tokens.id_token)) as any);
  } catch {
    return undefined;
  }
}

async function tokenRequest(params: Record<string, string>) {
  const c = config.cognito!;
  const res = await fetch(`${c.hostedUi}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.clientId, ...params }),
  });
  if (!res.ok) return undefined;
  return (await res.json()) as { id_token: string; refresh_token?: string };
}

const b64url = (b: Buffer) => b.toString("base64url");
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

/** URL de login del Hosted UI de Cognito con PKCE. */
export function loginUrl(cookies: AstroCookies, next: string | null, provider?: string): string {
  const c = config.cognito;
  if (!c) return config.devLogin ? `/auth/dev?next=${encodeURIComponent(safeNext(next))}` : "/";
  const verifierStr = b64url(randomBytes(32));
  const state = b64url(randomBytes(16));
  cookies.set(PKCE_COOKIE, JSON.stringify({ v: verifierStr, s: state, n: safeNext(next) }), cookieOpts(600));
  const url = new URL(`${c.hostedUi}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: c.clientId,
    redirect_uri: `${config.siteUrl}/auth/callback`,
    scope: "openid email profile",
    state,
    code_challenge_method: "S256",
    code_challenge: b64url(createHash("sha256").update(verifierStr).digest()),
    ...(provider ? { identity_provider: provider } : {}),
  }).toString();
  return url.toString();
}

export async function handleCallback(cookies: AstroCookies, code: string, state: string): Promise<string> {
  const raw = cookies.get(PKCE_COOKIE)?.value;
  cookies.delete(PKCE_COOKIE, { path: "/" });
  if (!raw) throw new Error("Sesión de login vencida");
  const pkce = JSON.parse(raw) as { v: string; s: string; n: string };
  if (pkce.s !== state) throw new Error("Estado inválido");
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${config.siteUrl}/auth/callback`,
    code_verifier: pkce.v,
  });
  if (!tokens) throw new Error("No se pudo iniciar sesión");
  cookies.set(ID_COOKIE, tokens.id_token, cookieOpts(3600));
  if (tokens.refresh_token) cookies.set(REFRESH_COOKIE, tokens.refresh_token, cookieOpts(30 * 86400));
  return pkce.n;
}

export function devLogin(cookies: AstroCookies, who: "admin" | "vecino") {
  if (config.devLogin) cookies.set(DEV_COOKIE, who, cookieOpts(86400));
}

export function logout(cookies: AstroCookies): string {
  for (const c of [ID_COOKIE, REFRESH_COOKIE, DEV_COOKIE]) cookies.delete(c, { path: "/" });
  const c = config.cognito;
  if (!c) return "/";
  return `${c.hostedUi}/logout?${new URLSearchParams({ client_id: c.clientId, logout_uri: `${config.siteUrl}/` })}`;
}
