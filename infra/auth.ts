/**
 * Login opcional para ciudadanos (seguir casos, "mis reportes") y obligatorio para el panel admin.
 * Grupos: `admin` (todo) y `moderador` (estados y moderación).
 * Google se habilita definiendo GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en `.env` al desplegar.
 */
export function createAuth(siteUrl: $util.Input<string>) {
  const prefix = `reporte-ciudadano-${$app.stage}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const userPool = new sst.aws.CognitoUserPool("Auth", {
    usernames: ["email"],
    domain: { prefix },
    transform: {
      userPool: (args) => {
        args.accountRecoverySetting = { recoveryMechanisms: [{ name: "verified_email", priority: 1 }] };
        args.passwordPolicy = { minimumLength: 8, requireLowercase: false, requireNumbers: false, requireSymbols: false, requireUppercase: false };
        args.userPoolTier = "LITE";
      },
    },
  });

  const providers = ["COGNITO"];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    userPool.addIdentityProvider("Google", {
      type: "google",
      details: {
        authorize_scopes: "email profile openid",
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
      },
      attributes: { email: "email", name: "name", username: "sub" },
    });
    providers.push("Google");
  }

  const callbacks = $dev
    ? ["http://localhost:4321/auth/callback"]
    : [$interpolate`${siteUrl}/auth/callback`];
  const client = userPool.addClient("Web", {
    providers,
    callbackUrls: callbacks,
    transform: {
      client: (args) => {
        args.allowedOauthFlows = ["code"];
        args.allowedOauthScopes = ["openid", "email", "profile"];
        args.logoutUrls = $dev ? ["http://localhost:4321/"] : [$interpolate`${siteUrl}/`];
        args.generateSecret = false;
        args.preventUserExistenceErrors = "ENABLED";
      },
    },
  });

  for (const [name, precedence] of [["admin", 1], ["moderador", 2]] as const) {
    new aws.cognito.UserGroup(`Group${name}`, { name, userPoolId: userPool.id, precedence });
  }

  const hostedUi = `https://${prefix}.auth.us-east-1.amazoncognito.com`;
  return { userPool, client, hostedUi };
}
