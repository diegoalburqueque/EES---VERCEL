---
id: INDICE
nombre: Índice de manuales del motor de calificación COMPIN
tipo: indice
version: 1.0.0
ultima_revision: 2026-08-20
---

# Manuales del bot — COMPIN Calificación de Discapacidad

Esta carpeta contiene los **documentos normativos oficiales de COMPIN RM convertidos a
texto plano**, uno por archivo, cada uno con su **prompt de uso arriba** y el
**contenido literal de la norma abajo**.

La idea: en vez de un prompt monolítico de 920 líneas donde todo está mezclado, el bot
lee **un archivo por lógica de negocio** y cada proceso declara qué manual necesita.

---

## Inventario

| ID | Archivo | Responde a | PDF fuente | Estado |
|---|---|---|---|---|
| **M1** | `M1-admisibilidad-checklist.md` | ¿El expediente es admisible? | 1.- CHECK LIST REVISIÓN DE SOLICITUD | ✅ completo |
| **M2** | `M2-formato-propuesta.md` | ¿Cómo se escribe la propuesta? | 2.- FORMATO PROPUESTA CALIFICACIÓN | ✅ completo |
| **M3** | `M3-guia-clinica.md` | ¿Qué debe traer el IBF por diagnóstico? | 3.- GUÍA CLÍNICA | ✅ completo |
| **M4** | `M4-nomenclatura-diagnosticos.md` | ¿Cómo se redacta cada diagnóstico? | 4.- PAUTA ELABORACIÓN DE DIAGNÓSTICOS | ✅ completo |
| **M5** | `M5-movilidad-reducida.md` | ¿Corresponde Movilidad Reducida? | 5.- CÁLCULO MOVILIDAD REDUCIDA | ✅ completo |
| **M6** | `M6-glosas.md` | ¿Qué glosa va en reducción/rechazo? | ⚠️ **Anexo de Glosas — NO ENTREGADO** | 🔴 pendiente |

Los PDF originales se mantienen en esta misma carpeta como respaldo. **Los `.md` son la
fuente de verdad para el bot**; los PDF son la fuente de verdad para auditoría.

---

## Anatomía de cada archivo

```
---
frontmatter          ← id, fuente, versión, qué procesos lo usan, de qué depende
---

# PROMPT DE USO — Mx
  Instrucciones al modelo: CÓMO usar este manual.
  Esto es lo que se mejora/afina con el tiempo.

---

# MANUAL — <título oficial>
  Contenido LITERAL de la norma, con anclas {#seccion.regla}.
  Esto NO se reescribe salvo que COMPIN cambie la norma.
```

**La separación importa:** el *prompt de uso* es tuyo y se itera; el *manual* es de
COMPIN y se transcribe fiel. Mezclarlos es lo que hacía imposible tocar el prompt actual
sin arriesgar las reglas.

---

## Sistema de anclas

Cada regla tiene un ancla estable: `{#ibf.vigencia}`, `{#metabolicas.rechazo}`,
`{#t4.reglas}`.

Sirven para que el bot **cite la regla exacta** que sustenta cada hallazgo:

```
Observación: el IBF no consigna fecha de emisión y la patología (gonartrosis)
no es de las crónicas exceptuadas.  →  M1§ibf.vigencia
```

Esto es lo que permite que un profesional COMPIN discuta un hallazgo y tú puedas mostrar
la línea del documento oficial que lo respalda. **No cambies un ancla existente**: si una
regla se reformula, sube la `version` del archivo y conserva el ancla.

---

## Mapa proceso → manual

Así es como cada etapa del bot sabe qué leer:

| Proceso | Qué hace | Manuales |
|---|---|---|
| **P1** Verificación de identidad | Contrasta cédula vs. plataforma vs. documentos | M1 |
| **P2** Datos de identificación | Extrae identificación, domicilio, zona | — |
| **P3** Datos de calificación | Diagnósticos, estado funcional, complementarios | M3, M4 |
| **P4** Checklist QA | Códigos de observación técnica | M1, M3 |
| **P5** Propuesta fundada | Redacta la propuesta para la comisión | M2, M3, M4, M5, M6 |
| **P6** Admisibilidad | Barrera de entrada documento por documento | M1, M3 |
| **P7** Carga Cero Filas | Prepara el bloque de carga | M2, M4, M5 |

---

## Cómo se ensambla (recomendación técnica)

**Una sola llamada a Claude**, con el prompt de sistema armado por concatenación:

```
BLOQUE CACHEABLE (estable, igual para todas las regiones)
  core/rol + reglas críticas + estilo
  M1 + M2 + M3 + M4 + M5 + M6
  ← aquí va el cache_control: ephemeral

BLOQUE VARIABLE (cambia por región/caso)
  P1 … P7
  overlay de región (RM / OHIGGINS / BIOBIO)
  contrato de salida JSON        ← último a propósito: es lo que más se obedece
```

Razón de los dos bloques: hoy el motor cachea el prompt completo
(`src/services/ai/claude.ts`, función `requestMessage`). Si lo que varía por región
quedara al principio, se rompe el prefijo cacheado y se pierde el ahorro. Manuales
estables primero, variables después.

**No** conviene hacer una llamada por proceso: obligaría a re-subir los PDFs del
expediente en cada llamada y multiplica el costo por 4–5.

---

## Trazabilidad

Al ensamblar, calcular `PROMPT_HASH` (sha256 del texto final) y guardarlo junto a
`MODULOS_VERSION` (lista de `id@version`) en `analysis-meta.json` y en el Maestro.

Hoy el motor tiene `DOCUMENT_SET_HASH` para saber si cambiaron los documentos, pero **no
registra con qué versión de reglas se generó cada ficha**. Con estos dos campos se puede
responder: *"esta ficha se hizo con M4 v1.0; la norma cambió en marzo; hay que reprocesar
estos 40 casos"*. También corrige la idempotencia: si mejoras un manual, el hash cambia y
el caso se reprocesa en vez de reutilizar un análisis viejo.

---

## Reglas de mantención

1. **Un archivo = un documento oficial.** No fusionar manuales ni partir uno en dos.
2. **Transcripción fiel.** El contenido bajo `# MANUAL` no se "mejora" de estilo. Si algo
   del original es ambiguo, se marca con una nota, no se resuelve inventando.
3. **Versionar a mano.** Subir `version` en el frontmatter cuando cambia una regla de
   negocio — es lo que termina en la trazabilidad. Git solo no basta.
4. **Anclas inmutables.** Ver arriba.
5. **Excepciones cerradas.** Las excepciones de M1 y M3 aplican sólo a los casos
   textualmente enumerados. Nunca por analogía.
6. **Fuente antes que criterio.** Si falta un documento (como M6 hoy), se marca
   `estado: PENDIENTE-FUENTE` y el bot lo declara en su salida. No se rellena con
   conocimiento general.

---

## Pendientes conocidos

- 🔴 **M6 — Anexo de Glosas.** No entregado. El bot está redactando glosas de reducción
  de % y de rechazo sin fuente oficial. **Es el hueco más importante.** Pedirlo a la
  Unidad de Discapacidad.
- 🟡 **Tramos etarios sin cobertura en M5.** El instrumento no define reglas para
  24 meses–1 mes ni bajo 6 meses. Confirmar con COMPIN qué aplica.
- 🟡 **Overlays regionales.** M1 es explícitamente RM. Falta confirmar si O'Higgins y
  Biobío usan el mismo checklist de admisibilidad o tienen el suyo.

---

## Verificación antes de poner en producción

El repo tiene **6 casos ya procesados** en `output/cases/RM/` (32542103, 32707392,
33417665, 33418560, 33433532, 33433694) con su `analysis.json` guardado. Son la red de
seguridad: reprocesarlos con los manuales nuevos y comparar contra el resultado anterior
muestra exactamente qué cambió y por qué. Hacerlo **antes** de correr un lote real.
