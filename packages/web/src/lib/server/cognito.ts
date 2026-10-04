import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { config } from "./config";

/**
 * Formularios propios de login, registro y recuperación contra la API pública de Cognito
 * (cliente sin secreto, USER_PASSWORD_AUTH). Google sigue pasando por el Hosted UI.
 */

export interface Tokens {
  id_token: string;
  refresh_token?: string;
}

export type SignInResult =
  | { ok: true; tokens: Tokens }
  | { ok: false; challenge: "NEW_PASSWORD"; session: string }
  | { ok: false; error: AuthError };

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  NotAuthorizedException: "El correo o la contraseña no son correctos.",
  UserNotFoundException: "El correo o la contraseña no son correctos.",
  UserNotConfirmedException: "Todavía no confirmaste tu correo.",
  UsernameExistsException: "Ya hay una cuenta con ese correo. Probá ingresar o recuperar tu contraseña.",
  CodeMismatchException: "El código no es correcto. Revisalo e intentá de nuevo.",
  ExpiredCodeException: "El código venció. Te enviamos uno nuevo.",
  InvalidPasswordException: "La contraseña tiene que tener al menos 8 caracteres.",
  LimitExceededException: "Demasiados intentos. Esperá unos minutos y volvé a probar.",
  TooManyRequestsException: "Demasiados intentos. Esperá unos minutos y volvé a probar.",
  TooManyFailedAttemptsException: "Demasiados intentos. Esperá unos minutos y volvé a probar.",
  CodeDeliveryFailureException: "No pudimos enviarte el correo. Revisá la dirección e intentá de nuevo.",
  InvalidParameterException: "Revisá los datos ingresados.",
  PasswordResetRequiredException: "Tenés que restablecer tu contraseña antes de ingresar.",
};

function toAuthError(err: unknown): AuthError {
  const name = (err as { name?: string })?.name ?? "Error";
  if (!MESSAGES[name]) console.error("cognito", err);
  return new AuthError(name, MESSAGES[name] ?? "No pudimos completar la operación. Intentá de nuevo en un rato.");
}

let client: CognitoIdentityProviderClient | undefined;
function cognito() {
  const c = config.cognito;
  if (!c) throw new AuthError("Unavailable", "El inicio de sesión no está disponible en este entorno.");
  client ??= new CognitoIdentityProviderClient({ region: c.userPoolId.split("_")[0] });
  return { client, clientId: c.clientId };
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw err instanceof AuthError ? err : toAuthError(err);
  }
}

const normEmail = (email: string) => email.trim().toLowerCase();

export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const { client, clientId } = cognito();
    const res = await client.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: { USERNAME: normEmail(email), PASSWORD: password },
    }));
    if (res.ChallengeName === "NEW_PASSWORD_REQUIRED" && res.Session) return { ok: false, challenge: "NEW_PASSWORD", session: res.Session };
    const r = res.AuthenticationResult;
    if (!r?.IdToken) throw new AuthError("Unsupported", "Tu cuenta requiere un paso de verificación que todavía no soportamos.");
    return { ok: true, tokens: { id_token: r.IdToken, refresh_token: r.RefreshToken } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthError ? err : toAuthError(err) };
  }
}

/** Usuarios creados por un admin (moderadores) eligen su contraseña en el primer ingreso. */
export const completeNewPassword = (email: string, session: string, password: string) =>
  run(async () => {
    const { client, clientId } = cognito();
    const res = await client.send(new RespondToAuthChallengeCommand({
      ClientId: clientId,
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      Session: session,
      ChallengeResponses: { USERNAME: normEmail(email), NEW_PASSWORD: password },
    }));
    const r = res.AuthenticationResult;
    if (!r?.IdToken) throw new AuthError("Unsupported", "No pudimos completar el ingreso.");
    return { id_token: r.IdToken, refresh_token: r.RefreshToken } satisfies Tokens;
  });

export const signUp = (name: string, email: string, password: string) =>
  run(async () => {
    const { client, clientId } = cognito();
    await client.send(new SignUpCommand({
      ClientId: clientId,
      Username: normEmail(email),
      Password: password,
      UserAttributes: [{ Name: "email", Value: normEmail(email) }, ...(name.trim() ? [{ Name: "name", Value: name.trim() }] : [])],
    }));
  });

export const confirmSignUp = (email: string, code: string) =>
  run(async () => {
    const { client, clientId } = cognito();
    await client.send(new ConfirmSignUpCommand({ ClientId: clientId, Username: normEmail(email), ConfirmationCode: code.trim() }));
  });

export const resendCode = (email: string) =>
  run(async () => {
    const { client, clientId } = cognito();
    await client.send(new ResendConfirmationCodeCommand({ ClientId: clientId, Username: normEmail(email) }));
  });

export const forgotPassword = (email: string) =>
  run(async () => {
    const { client, clientId } = cognito();
    await client.send(new ForgotPasswordCommand({ ClientId: clientId, Username: normEmail(email) }));
  });

export const confirmForgotPassword = (email: string, code: string, password: string) =>
  run(async () => {
    const { client, clientId } = cognito();
    await client.send(new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      Username: normEmail(email),
      ConfirmationCode: code.trim(),
      Password: password,
    }));
  });

/** Renueva el id token; sirve tanto para sesiones de estos formularios como del Hosted UI (Google). */
export async function refreshIdToken(refreshToken: string): Promise<string | undefined> {
  try {
    const { client, clientId } = cognito();
    const res = await client.send(new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: clientId,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }));
    return res.AuthenticationResult?.IdToken;
  } catch {
    return undefined;
  }
}
