/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "reporte-ciudadano",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: {
        aws: { region: "us-east-1", profile: process.env.CI ? undefined : "marcos" },
        random: "4.18.0",
      },
    };
  },
  async run() {
    const { createVpc } = await import("./infra/vpc");
    const { createDatabase } = await import("./infra/database");
    const { createStorage } = await import("./infra/storage");
    const { createModeration } = await import("./infra/moderation");
    const { createWeb } = await import("./infra/web");
    const { createBudget } = await import("./infra/budget");

    // En `sst dev` no se crea VPC ni RDS: todo corre contra Postgres local.
    const vpc = $dev ? undefined : createVpc();
    const lambdaVpc = vpc && { privateSubnets: vpc.privateSubnets, securityGroups: vpc.securityGroups };
    const db = createDatabase(vpc);
    const { media } = createStorage();
    createModeration(media, db, lambdaVpc);
    const { router, auth, siteUrl } = createWeb({ media, db, vpc: lambdaVpc });
    if ($app.stage === "production") createBudget(30);

    return {
      url: siteUrl,
      cloudfront: router.url,
      hostedUi: auth.hostedUi,
      natInstance: vpc?.natInstanceId,
    };
  },
});
