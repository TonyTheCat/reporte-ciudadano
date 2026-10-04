/**
 * Correos de Cognito con la marca "Lapacho & Ka'aguy" (mismos colores que packages/web/src/styles/global.css).
 * HTML de tablas y estilos en línea para que se vea bien en Gmail, Outlook y Apple Mail.
 * Cognito reemplaza {####} por el código y {username} por el usuario; el mensaje no puede pasar de 20.000 caracteres.
 */

const C = {
  brand: "#0f6b55",
  brandDark: "#0a3229",
  brandSoft: "#ecf7f3",
  lapacho: "#d6336c",
  sol: "#f2b33d",
  sand: "#f6f3ec",
  sandLine: "#ebe5d8",
  ink: "#0e1f1b",
  muted: "#5b6b66",
};
const FONT = `'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const DISPLAY = `'Bricolage Grotesque','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

export type EmailKind = "signup" | "resend" | "forgot" | "verify-attr" | "invite" | "mfa";

export interface EmailInput {
  kind: EmailKind;
  siteUrl: string;
  email: string;
  name?: string;
  codeParameter: string;
  usernameParameter?: string;
}

export interface Email {
  subject: string;
  html: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function codeBox(code: string, caption: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px">
<tr><td align="center" style="background:${C.brandSoft};border:1px solid #d2ede4;border-radius:16px;padding:22px 16px">
<div style="font:600 12px/1 ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${C.brand}">${caption}</div>
<div style="font:700 36px/1.2 'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;letter-spacing:10px;color:${C.ink};margin-top:10px">${code}</div>
</td></tr></table>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px"><tr>
<td style="border-radius:12px;background:${C.brand}"><a href="${href}" style="display:inline-block;padding:14px 26px;font:600 16px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:12px">${label}</a></td>
</tr></table>`;
}

const p = (html: string, extra = "") => `<p style="margin:0 0 14px;font:400 16px/1.6 ${FONT};color:${C.ink};${extra}">${html}</p>`;
const small = (html: string) => `<p style="margin:0 0 10px;font:400 14px/1.6 ${FONT};color:${C.muted}">${html}</p>`;

function layout(o: { site: string; preheader: string; eyebrow: string; title: string; body: string; footnote: string }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${o.title}</title></head>
<body style="margin:0;padding:0;background:${C.sand}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${o.preheader}&#8202;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 20px">
<a href="${o.site}" style="text-decoration:none"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:10px"><img src="${o.site}/brand/email-icon.png" width="36" height="36" alt="" style="display:block;border:0;border-radius:9px"></td>
<td style="font:800 19px/1 ${DISPLAY};letter-spacing:-.02em;color:${C.ink}">Reporte<span style="color:${C.brand}">Ciudadano</span></td>
</tr></table></a>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${C.sandLine};border-radius:20px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td height="6" style="background:${C.brand};font-size:0;line-height:0" width="70%">&nbsp;</td>
<td height="6" style="background:${C.lapacho};font-size:0;line-height:0" width="20%">&nbsp;</td>
<td height="6" style="background:${C.sol};font-size:0;line-height:0" width="10%">&nbsp;</td>
</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:34px 36px 30px">
<div style="font:600 13px/1 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${C.lapacho};margin-bottom:12px">${o.eyebrow}</div>
<h1 style="margin:0 0 18px;font:800 28px/1.15 ${DISPLAY};letter-spacing:-.02em;color:${C.ink}">${o.title}</h1>
${o.body}
</td></tr>
<tr><td style="padding:18px 36px 22px;border-top:1px solid ${C.sandLine};background:#fbf9f4">${small(o.footnote)}</td></tr>
</table>
</td></tr>
<tr><td style="padding:22px 8px 0;text-align:center">
<p style="margin:0 0 6px;font:400 13px/1.6 ${FONT};color:${C.muted}">Reporte Ciudadano · Mapa abierto de problemas urbanos de Paraguay</p>
<p style="margin:0;font:400 13px/1.6 ${FONT};color:${C.muted}"><a href="${o.site}" style="color:${C.brand};text-decoration:none;font-weight:600">${o.site.replace(/^https?:\/\//, "")}</a> · <a href="${o.site}/privacidad" style="color:${C.muted}">Privacidad</a> · <a href="${o.site}/terminos" style="color:${C.muted}">Términos</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const NOT_YOU = "Si no fuiste vos, podés ignorar este correo: nadie puede usar tu cuenta sin este código.";

export function renderEmail(i: EmailInput): Email {
  const site = i.siteUrl.replace(/\/$/, "");
  const hello = i.name ? `Hola, ${esc(i.name.split(" ")[0])}:` : "¡Hola!";
  const q = (path: string) => `${site}${path}?email=${encodeURIComponent(i.email)}&amp;code=${i.codeParameter}`;
  // Los enlaces llevan el código para precargarlo; la página lo ignora si no son 6 dígitos.

  switch (i.kind) {
    case "signup":
    case "resend":
      return {
        subject: i.kind === "signup" ? "Confirmá tu correo para activar tu cuenta" : "Tu nuevo código de confirmación",
        html: layout({
          site,
          preheader: `Tu código es ${i.codeParameter}. Vence en 24 horas.`,
          eyebrow: i.kind === "signup" ? "Bienvenida" : "Nuevo código",
          title: "Confirmá tu correo",
          body:
            p(hello) +
            p("Gracias por sumarte a Reporte Ciudadano. Para activar tu cuenta, ingresá este código en la página de confirmación:") +
            codeBox(i.codeParameter, "Tu código") +
            button(q("/registro/confirmar"), "Confirmar mi cuenta") +
            small("El código vence en 24 horas.") +
            p(`Con tu cuenta vas a poder <strong>seguir tus reportes</strong> desde cualquier dispositivo y recibir avisos cuando cambien de estado.`, "margin-top:18px"),
          footnote: `Recibiste este correo porque alguien creó una cuenta con ${esc(i.email)}. ${NOT_YOU}`,
        }),
      };

    case "forgot":
      return {
        subject: "Tu código para restablecer la contraseña",
        html: layout({
          site,
          preheader: `Usá el código ${i.codeParameter} para crear una contraseña nueva. Vence en 1 hora.`,
          eyebrow: "Seguridad de tu cuenta",
          title: "Restablecé tu contraseña",
          body:
            p(hello) +
            p("Recibimos un pedido para crear una contraseña nueva. Usá este código para continuar:") +
            codeBox(i.codeParameter, "Código de recuperación") +
            button(q("/recuperar/nueva"), "Crear nueva contraseña") +
            small("El código vence en 1 hora y sirve una sola vez."),
          footnote: `Si no pediste cambiar tu contraseña, ignorá este correo: tu contraseña actual sigue funcionando.`,
        }),
      };

    case "verify-attr":
      return {
        subject: "Verificá tu nuevo correo",
        html: layout({
          site,
          preheader: `Tu código de verificación es ${i.codeParameter}.`,
          eyebrow: "Cambio de correo",
          title: "Verificá tu correo",
          body:
            p(hello) +
            p("Para usar esta dirección en tu cuenta de Reporte Ciudadano, ingresá este código:") +
            codeBox(i.codeParameter, "Código de verificación") +
            small("El código vence en 24 horas."),
          footnote: NOT_YOU,
        }),
      };

    case "invite":
      return {
        subject: "Te invitaron a Reporte Ciudadano",
        html: layout({
          site,
          preheader: "Ya tenés cuenta en el equipo de gestión. Entrá con tu contraseña temporal.",
          eyebrow: "Invitación al equipo",
          title: "Ya tenés cuenta",
          body:
            p(hello) +
            p("Te crearon una cuenta en Reporte Ciudadano para ayudar a gestionar y moderar los reportes. Estos son tus datos de acceso:") +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;background:${C.brandSoft};border:1px solid #d2ede4;border-radius:16px">
<tr><td style="padding:18px 22px 6px;font:600 12px/1 ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${C.brand}">Usuario</td></tr>
<tr><td style="padding:0 22px 14px;font:600 17px/1.4 ${FONT};color:${C.ink}">${i.usernameParameter}</td></tr>
<tr><td style="padding:4px 22px 6px;font:600 12px/1 ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${C.brand}">Contraseña temporal</td></tr>
<tr><td style="padding:0 22px 18px;font:700 20px/1.4 'SFMono-Regular',Menlo,Consolas,monospace;color:${C.ink}">${i.codeParameter}</td></tr>
</table>` +
            button(`${site}/ingresar?next=%2Fadmin`, "Ingresar al panel") +
            small("Al entrar por primera vez te vamos a pedir que elijas una contraseña nueva. La temporal vence en 7 días."),
          footnote: "Si no esperabas esta invitación, respondé a quien te la envió o ignorá este correo.",
        }),
      };

    case "mfa":
      return {
        subject: "Tu código para ingresar",
        html: layout({
          site,
          preheader: `Tu código de ingreso es ${i.codeParameter}.`,
          eyebrow: "Ingreso",
          title: "Tu código para ingresar",
          body: p(hello) + p("Usá este código para terminar de ingresar a tu cuenta:") + codeBox(i.codeParameter, "Código de ingreso") + small("Vence en pocos minutos."),
          footnote: NOT_YOU,
        }),
      };
  }
}

/** Origen de Cognito → tipo de correo. Los orígenes no listados usan el mensaje por defecto del pool. */
export const TRIGGER_KIND: Record<string, EmailKind> = {
  CustomMessage_SignUp: "signup",
  CustomMessage_ResendCode: "resend",
  CustomMessage_ForgotPassword: "forgot",
  CustomMessage_UpdateUserAttribute: "verify-attr",
  CustomMessage_VerifyUserAttribute: "verify-attr",
  CustomMessage_AdminCreateUser: "invite",
  CustomMessage_Authentication: "mfa",
};
