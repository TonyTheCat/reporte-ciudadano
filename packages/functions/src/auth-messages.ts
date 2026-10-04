import type { CustomMessageTriggerHandler } from "aws-lambda";
import { renderEmail, TRIGGER_KIND } from "./auth-email";

/** Trigger CustomMessage de Cognito: reemplaza los correos genéricos por los de la marca. */
export const handler: CustomMessageTriggerHandler = async (event) => {
  const kind = TRIGGER_KIND[event.triggerSource];
  if (!kind) return event;
  const attrs = event.request.userAttributes;
  const { subject, html } = renderEmail({
    kind,
    siteUrl: process.env.SITE_URL ?? "https://ciudadano.tereredev.com",
    email: attrs.email ?? "",
    name: attrs.name,
    codeParameter: event.request.codeParameter ?? "{####}",
    usernameParameter: event.request.usernameParameter ?? "{username}",
  });
  event.response.emailSubject = subject;
  event.response.emailMessage = html;
  return event;
};
