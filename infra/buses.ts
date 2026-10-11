/**
 * Recorridos de los colectivos: una vez por día se traen del prototipo del VMT a la base (sale por la NAT).
 * El primer deploy los carga el migrador (infra/database.ts), así el mapa no espera a la primera corrida.
 * En `sst dev` no se crea: la base local se carga con `pnpm db:bus-routes`.
 */
export function createBusRoutesSync(
  db: sst.Linkable<any> | sst.aws.Postgres,
  vpc: { privateSubnets: $util.Input<string>[]; securityGroups: $util.Input<string>[] },
) {
  new sst.aws.Cron("BusRoutesSync", {
    schedule: "rate(1 day)",
    function: {
      handler: "packages/functions/src/bus-routes.handler",
      link: [db],
      vpc,
      // El VMT tarda hasta un minuto por empresa y se piden de a una.
      timeout: "15 minutes",
      memory: "512 MB",
      architecture: "arm64",
    },
  });
}
