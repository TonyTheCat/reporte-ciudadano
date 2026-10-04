import { readFileSync } from "node:fs";

/**
 * Login opcional para ciudadanos (seguir casos, "mis reportes") y obligatorio para el panel admin.
 * Grupos: `admin` (todo) y `moderador` (estados y moderación).
 * El sitio usa formularios propios (/ingresar, /registro, /recuperar) contra la API de Cognito; el Hosted UI
 * queda para Google y con la misma marca por si alguien llega a él.
 * Google se habilita definiendo GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en `.env` al desplegar.
 * Los correos salen del trigger CustomMessage (packages/functions/src/auth-messages.ts); con SES habilitado
 * se envían desde el dominio propio en vez de no-reply@verificationemail.com (límite de 50 por día).
 */
export function createAuth(siteUrl: $util.Input<string>, email?: sst.aws.Email) {
  const prefix = `reporte-ciudadano-${$app.stage}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  const userPool = new sst.aws.CognitoUserPool("Auth", {
    usernames: ["email"],
    domain: { prefix },
    triggers: {
      customMessage: {
        handler: "packages/functions/src/auth-messages.handler",
        architecture: "arm64",
        environment: { SITE_URL: siteUrl },
      },
    },
    transform: {
      userPool: (args) => {
        args.accountRecoverySetting = { recoveryMechanisms: [{ name: "verified_email", priority: 1 }] };
        args.passwordPolicy = { minimumLength: 8, requireLowercase: false, requireNumbers: false, requireSymbols: false, requireUppercase: false };
        args.userPoolTier = "LITE";
        // Respaldo si el trigger no respondiera; el asunto y el HTML reales salen de auth-messages.
        args.verificationMessageTemplate = {
          defaultEmailOption: "CONFIRM_WITH_CODE",
          emailSubject: "Tu código de Reporte Ciudadano",
          emailMessage: "Tu código de Reporte Ciudadano es {####}",
        };
        if (email) {
          args.emailConfiguration = {
            emailSendingAccount: "DEVELOPER",
            sourceArn: email.nodes.identity.arn,
            fromEmailAddress: $interpolate`Reporte Ciudadano <cuenta@${email.sender}>`,
          };
        }
      },
    },
  });

  const providers = ["COGNITO"];
  if (googleEnabled) {
    userPool.addIdentityProvider("Google", {
      type: "google",
      details: {
        authorize_scopes: "email profile openid",
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      attributes: { email: "email", name: "name", username: "sub" },
    });
    providers.push("Google");
  }

  const callbacks = $dev
    ? ["http://localhost:4321/auth/callback"]
    : [$interpolate`${siteUrl}/auth/callback`];
  const client = userPool.addClient("AuthClient", {
    providers,
    callbackUrls: callbacks,
    transform: {
      client: (args) => {
        args.allowedOauthFlows = ["code"];
        args.allowedOauthScopes = ["openid", "email", "profile"];
        args.logoutUrls = $dev ? ["http://localhost:4321/"] : [$interpolate`${siteUrl}/`];
        args.generateSecret = false;
        args.preventUserExistenceErrors = "ENABLED";
        // Formularios propios: usuario y contraseña desde el servidor, y renovación de sesión.
        args.explicitAuthFlows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"];
      },
    },
  });

  for (const [name, precedence] of [["admin", 1], ["moderador", 2]] as const) {
    new aws.cognito.UserGroup(`Group${name}`, { name, userPoolId: userPool.id, precedence });
  }

  // Marca en el Hosted UI clásico (logo + CSS). Necesita que el dominio exista: depende del componente.
  new aws.cognito.UserPoolUICustomization("AuthUi", {
    userPoolId: userPool.id,
    css: readFileSync("infra/hosted-ui.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").trim(),
    imageFile: readFileSync("packages/web/public/brand/logo-horizontal.png").toString("base64"),
  }, { dependsOn: [userPool] });

  const hostedUi = `https://${prefix}.auth.us-east-1.amazoncognito.com`;
  return { userPool, client, hostedUi, googleEnabled };
}
