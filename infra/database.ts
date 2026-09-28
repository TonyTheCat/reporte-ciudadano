import type { createVpc } from "./vpc";

export const LOCAL_DB = {
  host: "localhost",
  port: 5433,
  username: "postgres",
  password: "password",
  database: "reporte",
};

export function createDatabase(vpc: ReturnType<typeof createVpc> | undefined) {
  // En `sst dev` se usa el Postgres local de docker-compose (sin costo).
  if (!vpc) return new sst.Linkable("Database", { properties: LOCAL_DB });

  const db = new sst.aws.Postgres("Database", {
    version: "17",
    instance: "t4g.micro",
    storage: "20 GB",
    database: "reporte",
    vpc: { subnets: vpc.privateSubnets },
    transform: {
      instance: (args) => {
        args.backupRetentionPeriod = 7;
        args.deletionProtection = $app.stage === "production";
        args.performanceInsightsEnabled = false;
        args.autoMinorVersionUpgrade = true;
      },
    },
  });

  // Aplica las migraciones en cada deploy (el migrador es idempotente).
  const migrator = new sst.aws.Function("DatabaseMigrator", {
    handler: "packages/functions/src/migrator.handler",
    link: [db],
    vpc,
    timeout: "15 minutes",
    memory: "1024 MB",
    copyFiles: [{ from: "packages/core/migrations", to: "migrations" }],
  });
  new aws.lambda.Invocation("DatabaseMigratorInvocation", {
    input: Date.now().toString(),
    functionName: migrator.name,
  });

  return db;
}
