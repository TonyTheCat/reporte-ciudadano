import { describe, expect, it } from "vitest";
import { renderEmail, TRIGGER_KIND, type EmailKind } from "../src/auth-email";
import { handler } from "../src/auth-messages";

const kinds = [...new Set(Object.values(TRIGGER_KIND))] as EmailKind[];
const base = { siteUrl: "https://ciudadano.tereredev.com/", email: "ana+test@correo.com", name: "Ana <b>Pérez</b>", codeParameter: "{####}", usernameParameter: "{username}" };

describe("correos de Cognito", () => {
  it.each(kinds)("%s incluye el código, entra en el límite de Cognito y escapa datos", (kind) => {
    const { subject, html } = renderEmail({ kind, ...base });
    expect(subject.length).toBeGreaterThan(5);
    expect(html).toContain("{####}");
    expect(html.length).toBeLessThan(20_000);
    expect(html).not.toContain("<b>");
    expect(html).toContain("https://ciudadano.tereredev.com/brand/email-icon.png");
  });

  it("la invitación incluye usuario y contraseña temporal", () => {
    const { html } = renderEmail({ kind: "invite", ...base });
    expect(html).toContain("{username}");
    expect(html).toContain("/ingresar?next=%2Fadmin");
  });

  it("el enlace de confirmación precarga correo y código", () => {
    const { html } = renderEmail({ kind: "signup", ...base });
    expect(html).toContain("/registro/confirmar?email=ana%2Btest%40correo.com&amp;code={####}");
  });

  it("el handler completa asunto y mensaje y deja pasar orígenes desconocidos", async () => {
    const event: any = {
      triggerSource: "CustomMessage_ForgotPassword",
      request: { userAttributes: { email: "ana@correo.com" }, codeParameter: "{####}", usernameParameter: null },
      response: {},
    };
    const out: any = await (handler as any)(event, {} as any, () => {});
    expect(out.response.emailSubject).toMatch(/contraseña/);
    expect(out.response.emailMessage).toContain("{####}");

    const other: any = { triggerSource: "CustomMessage_Unknown", request: { userAttributes: {} }, response: {} };
    expect(((await (handler as any)(other, {} as any, () => {})) as any).response.emailMessage).toBeUndefined();
  });
});
