# Seguridad

Reporte Ciudadano guarda reportes de personas, a veces anónimas, sobre temas sensibles como inseguridad. Tomamos en serio cualquier falla que pueda exponer a quien reporta.

## Reportar una vulnerabilidad

**No abras un issue público.** Usá el [reporte privado de vulnerabilidades de GitHub](https://github.com/marcosferr/reporte-ciudadano/security/advisories/new).

Incluí:

- Qué encontraste y dónde (URL, endpoint o archivo).
- Pasos para reproducirlo.
- Qué impacto tiene (por ejemplo: "permite ver el correo de quien sigue un reporte").

Respondemos en un máximo de 7 días. Te avisamos cuando esté corregido y, si querés, te damos crédito en el aviso.

## Qué nos interesa especialmente

- Exposición de datos personales: identidad de quien reporta, correos, IP, fotos originales sin difuminar.
- Saltos de autenticación o de roles (acceder al panel de admin, cambiar estados sin permiso).
- Inyección SQL, XSS, CSRF.
- Formas de evadir la moderación de imágenes o el rate limiting a escala.

## Fuera de alcance

- Ataques de denegación de servicio por volumen.
- Ingeniería social a quienes mantienen el proyecto.
- Pruebas que creen reportes falsos masivos en producción: usá tu entorno local.
