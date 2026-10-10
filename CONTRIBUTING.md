# Cómo contribuir

¡Gracias por querer mejorar Reporte Ciudadano! Este documento explica cómo proponer cambios.

## Formas de ayudar

- **Reportar errores** o proponer mejoras en [Issues](https://github.com/marcosferr/reporte-ciudadano/issues).
- **Corregir datos**: nombres de departamentos o distritos (`packages/core/src/area-names.ts`), categorías, textos.
- **Código**: tomá un issue con la etiqueta `good first issue` o `help wanted`, o abrí uno antes de empezar algo grande para acordar el enfoque.
- **Documentación**: si algo de `docs/` no te funcionó tal cual, eso es un error; avisanos o corregilo.

Para vulnerabilidades de seguridad **no abras un issue público**: seguí [SECURITY.md](SECURITY.md).

## Antes de empezar

1. Prepará el entorno con [docs/DESARROLLO.md](docs/DESARROLLO.md).
2. Leé [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) si tu cambio toca más de un paquete, la base o la infraestructura.

## Flujo de trabajo

`main` está protegida: nadie (tampoco quienes mantienen el proyecto) empuja directo. Todo entra por pull request con el CI en verde.

```bash
# 1. Fork (si no tenés permiso de escritura) y clon
git clone git@github.com:<tu-usuario>/reporte-ciudadano.git
cd reporte-ciudadano

# 2. Rama desde main actualizado
git switch main && git pull
git switch -c feat/filtro-por-barrio

# 3. Cambios + verificación local
pnpm typecheck
pnpm test
pnpm --filter @rc/functions test
pnpm --filter @rc/web test

# 4. Commit y push
git push -u origin feat/filtro-por-barrio
```

Después abrí el pull request contra `main` y completá la plantilla.

### Nombres de ramas

`tipo/descripcion-corta`, con los mismos tipos que los commits: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`, `infra/`.

### Mensajes de commit

En español, en imperativo o descriptivo, la primera línea de hasta ~72 caracteres:

```
Agrega filtro por barrio en la consulta GIS

El trigger ya asignaba barrio_id; faltaba exponerlo en stats.ts
y en el selector de GisQuery.
```

Usá el cuerpo para explicar **por qué**, no qué (eso ya lo dice el diff).

### Pull requests

- **Uno por tema.** Un PR chico se revisa en minutos; uno enorme se queda semanas.
- **El CI tiene que pasar**: typecheck, tests de `core` contra PostGIS y tests de `functions` y `web`.
- **Tests**: si cambiás lógica de `packages/core` o `packages/functions`, agregá o ajustá tests.
- **Capturas** si cambia algo visible, en celular y escritorio.
- **Migraciones**: archivo nuevo numerado; nunca edites uno ya mergeado.
- Se mergea con **squash**, así que el título del PR queda como mensaje del commit en `main`.

## Convenciones de código

- **TypeScript estricto** en todo el monorepo. Nada de `any` nuevo sin un motivo.
- **Seguí el estilo del archivo que estás tocando**: nombres, densidad de comentarios, formato.
- **Idioma**: textos de la interfaz, comentarios, mensajes de error y commits en **español** (voseo rioplatense/paraguayo: "Reportá", "Probá de nuevo"). Identificadores de código en inglés.
- **Comentarios** para el *por qué* no obvio; no expliques lo que el código ya dice.
- **El dominio va en `core`**: los endpoints de `web` validan con Zod, llaman a funciones de `core` y devuelven JSON. Si estás escribiendo SQL en `packages/web`, probablemente va en `core`.
- **SQL**: siempre con los tagged templates de `postgres` (`sql\`...${valor}\``), nunca concatenando strings. Coordenadas en EPSG:4326.
- **Errores de negocio**: `throw new DomainError(code, mensaje, status)`.
- **Sin costo fijo nuevo**: si tu cambio agrega un recurso de AWS que se cobra por hora, discutilo antes en un issue.
- **Privacidad**: no expongas `reporter_user_id`, `ip_hash`, correos ni originales de fotos en respuestas públicas ni en exportaciones.
- **Accesibilidad**: etiquetas en formularios, contraste suficiente, navegable con teclado.
- **Colores**: usá los tokens de `packages/web/src/styles/global.css` (`bg-surface`, `text-fg-muted`, `ring-line`, `text-danger`…), no la paleta de Tailwind (`slate`, `gray`, `red`…) ni colores sueltos: los tokens ya tienen su valor para el modo oscuro. Para un color que viene de la base (estado o categoría), usá `tint` con `style="--tint: #hex"`.

## Dependencias

- Usá `pnpm add` dentro del paquete que la necesita (`pnpm --filter @rc/web add <pkg>`).
- Si el paquete ejecuta scripts de instalación, agregalo a `allowBuilds` en `pnpm-workspace.yaml`.
- Commiteá el `pnpm-lock.yaml` actualizado.
- Preferí no sumar dependencias para lo que se resuelve en pocas líneas.

## Revisión

Quien revisa mira, en este orden: que funcione y tenga tests, que respete la privacidad y el costo, que siga la arquitectura, y el estilo. Respondé los comentarios con cambios o con el motivo para no hacerlos; las dos cosas están bien.

## Código de conducta

Este proyecto sigue el [Código de conducta](CODE_OF_CONDUCT.md). Al participar, aceptás respetarlo.

## Licencia

Al contribuir, aceptás que tu aporte se publique bajo la [licencia MIT](LICENSE) del proyecto.
