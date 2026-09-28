import type { createStorage } from "./storage";

/** Procesa cada foto subida: detecta caras y contenido inapropiado, difumina y publica. */
export function createModeration(
  media: ReturnType<typeof createStorage>["media"],
  db: sst.Linkable<any> | sst.aws.Postgres,
  vpc: { privateSubnets: $util.Input<string>[]; securityGroups: $util.Input<string>[] } | undefined,
) {
  media.notify({
    notifications: [
      {
        name: "Moderation",
        function: {
          handler: "packages/functions/src/moderation.handler",
          link: [media, db],
          vpc,
          memory: "1536 MB",
          timeout: "60 seconds",
          nodejs: { install: ["sharp"] },
          architecture: "arm64",
          permissions: [{ actions: ["rekognition:DetectFaces", "rekognition:DetectModerationLabels"], resources: ["*"] }],
        },
        events: ["s3:ObjectCreated:*"],
        filterPrefix: "uploads/",
      },
    ],
  });
}
