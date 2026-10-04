# reporte-ciudadano

Plataforma abierta para reportar y dar seguimiento a problemas urbanos de Paraguay (baches, raudales, inseguridad, vertederos ilegales, propaganda electoral fuera de fecha, alumbrado…) con mapa, fotos y consultas GIS.

Producción: https://ciudadano.tereredev.com

## Stack

| Capa | Tecnología |
|---|---|
| Infraestructura | SST v4 (Pulumi) en AWS `us-east-1` |
| Web | Astro 5 SSR en Lambda + islas React, Tailwind 4, MapLibre GL 5 |
| Base de datos | RDS PostgreSQL 17 + PostGIS (t4g.micro) |
| Archivos | S3 (`uploads/` privado, `public/` servido por CloudFront en `/media`) |
| Moderación | Lambda + Rekognition (difumina caras, filtra contenido) |
| Auth | Cognito con formularios propios (`/ingresar`, `/registro`, `/recuperar`), Google opcional vía Hosted UI, correos de marca (trigger CustomMessage), grupos `admin` y `moderador` |
| Mapa base | OpenFreeMap (gratis, sin API key) |
| Límites administrativos | DGEEC vía geoBoundaries (CC BY 4.0) |

```
packages/core       dominio + SQL PostGIS (reportes, estados, tiles MVT, estadísticas) y migraciones
packages/functions  Lambdas: migrador (+carga de áreas) y moderación de fotos
packages/web        app Astro (páginas, API, tiles /tiles/{z}/{x}/{y}.pbf, sitemap)
infra/              VPC con 1 NAT fck-nat, RDS, bucket, Cognito, CloudFront, presupuesto
```

## Costo fijo estimado: ~USD 21/mes

RDS t4g.micro + 20 GB (~13,5) · NAT t4g.nano + IPv4 (~7,3). El resto es por uso (Lambda, CloudFront, S3, Rekognition ≈ USD 0,002/foto). Con `ALERT_EMAIL` definido se crea una alerta de AWS Budgets a USD 30.

## Desarrollo local

Requisitos: Node 24, pnpm, Docker.

```bash
pnpm install
pnpm db:up            # PostGIS en localhost:5433
pnpm db:migrate
pnpm db:seed -- --demo  # departamentos, distritos y reportes de ejemplo
pnpm test             # tests de dominio/GIS contra PostGIS

cd packages/web
DATABASE_URL=postgres://postgres:password@localhost:5433/reporte DEV_LOGIN=1 pnpm dev
```

Con `DEV_LOGIN=1`, `/auth/dev?as=admin` inicia sesión como admin de prueba (solo local, nunca en Lambda). Sin AWS las fotos no se suben (no hay bucket).

Para desarrollar contra AWS real (bucket, Rekognition, Cognito) usá `pnpm dev` en la raíz (`sst dev`): usa la base local y crea el resto en tu stage personal.

## Despliegue a producción

El DNS de `tereredev.com` está en Hostinger, así que el certificado y el CNAME se cargan a mano.

**Credenciales**: el perfil `marcos` usa `aws login` (`login_session`), que SST todavía no soporta. En `~/.aws/config` hay un perfil puente que reutiliza esa sesión:

```ini
[profile marcos-sst]
credential_process = aws configure export-credentials --profile marcos --format process
region = us-east-1
```

Todos los comandos de SST se corren con `AWS_PROFILE=marcos-sst` (por ejemplo `AWS_PROFILE=marcos-sst pnpm run deploy`).

1. **Certificado** (una sola vez):
   ```bash
   aws acm request-certificate --domain-name ciudadano.tereredev.com \
     --validation-method DNS --region us-east-1 --profile marcos
   aws acm describe-certificate --certificate-arn <ARN> --region us-east-1 --profile marcos \
     --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
   ```
   Cargá ese CNAME en Hostinger y esperá a que el estado sea `ISSUED`.

2. **Variables** en `.env` (ver `.env.example`): `CERT_ARN`, `ALERT_EMAIL`, y opcionalmente `PUBLIC_TURNSTILE_SITE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

3. **Secretos** (opcional, captcha):
   ```bash
   npx sst secret set TurnstileSecret <secreto> --stage production
   ```

4. **Deploy**:
   ```bash
   pnpm run deploy
   ```
   El migrador aplica las migraciones y, en el primer deploy, carga departamentos y distritos.

5. **DNS**: en Hostinger, CNAME `ciudadano` → el dominio de CloudFront que muestra la salida `cloudfront`.

6. **Primer admin**: registrate en el sitio (“Ingresar”) y después:
   ```bash
   aws cognito-idp admin-add-user-to-group --profile marcos --region us-east-1 \
     --user-pool-id <id del pool> --username <tu correo> --group-name admin
   ```

7. **Correo (SES)**: obtené los registros DKIM con
   `aws sesv2 get-email-identity --email-identity ciudadano.tereredev.com --profile marcos`,
   cargá los 3 CNAME en Hostinger y pedí salir del sandbox de SES desde la consola.

8. **Google Search Console**: verificá el dominio y enviá `https://ciudadano.tereredev.com/sitemap.xml`.

## Acceso a la base para análisis GIS (QGIS / psql)

La base no es pública. La instancia NAT funciona como bastión vía SSM:

```bash
aws ssm start-session --profile marcos --target <natInstance> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters host=<host RDS>,portNumber=5432,localPortNumber=5434
```

y conectá QGIS a `localhost:5434`. Las credenciales están en `npx sst shell --stage production`.

## Estados de un reporte

`nuevo → verificado → en_proceso → derivado → resuelto | rechazado | duplicado` (ver `packages/core/src/status.ts`). Cada cambio queda en `report_events` y avisa por correo a quienes siguen el caso.
