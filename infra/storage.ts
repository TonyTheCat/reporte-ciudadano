/**
 * Un solo bucket para fotos:
 *   uploads/  originales subidos por el público (privados, se borran a los 90 días)
 *   public/   versiones difuminadas y miniaturas, servidas por CloudFront en /media/*
 */
export function createStorage() {
  const media = new sst.aws.Bucket("Media", {
    access: "cloudfront",
    cors: {
      allowOrigins: ["*"],
      allowMethods: ["POST", "GET", "HEAD"],
      allowHeaders: ["*"],
      maxAge: "1 day",
    },
    lifecycle: [{ id: "expire-originals", prefix: "uploads/", expiresIn: "90 days" }],
  });
  return { media };
}
