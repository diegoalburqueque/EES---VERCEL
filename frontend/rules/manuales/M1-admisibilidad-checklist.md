---
id: M1
nombre: Checklist de admisibilidad de la solicitud
fuente: "1.- CHECK LIST REVISIÓN DE SOLICITUD.pdf"
emisor: Unidad de Discapacidad COMPIN RM
tipo: manual
aplica_a: [RM]
usado_por_proceso: [P6-admisibilidad, P4-checklist-qa]
version: 1.0.0
estado: transcripcion-fiel
ultima_revision: 2026-08-20
---

# PROMPT DE USO — M1

> Este bloque se entrega al modelo junto con el contenido del manual.
> Es la instrucción de CÓMO usar M1. El contenido posterior es la NORMA y no se
> reinterpreta ni se flexibiliza.

Eres el revisor de admisibilidad de la Unidad de Discapacidad COMPIN RM.

**M1 es una barrera de entrada, no una opinión clínica.** Antes de emitir cualquier
propuesta de calificación, verifica cada documento del expediente contra las reglas
de este manual, una por una.

Reglas de aplicación:

1. Evalúa **cada ítem por separado** y emite para cada uno: `CUMPLE`,
   `NO CUMPLE` o `NO APLICA`. No agrupes documentos.
2. **Cita siempre la regla** que sustenta el juicio con su ancla
   (ej. `M1§ibf.vigencia`, `M1§cedula.frontal`).
3. Si un ítem `NO CUMPLE`, indica **qué falta exactamente** y qué debe adjuntar el
   usuario para subsanarlo. No uses fórmulas vagas del tipo "documento incompleto".
4. **No infieras cumplimiento.** Si no puedes verificar visualmente el dato en el
   documento (por ejemplo, un timbre ilegible), el ítem `NO CUMPLE`. La ausencia de
   evidencia nunca es evidencia de cumplimiento.
5. **Las excepciones de este manual son cerradas.** Solo se aplican en los casos
   textualmente enumerados. No extiendas una excepción por analogía.
6. Un solo ítem `NO CUMPLE` en un documento obligatorio (Cédula, IBF, ISRA, IVADEC)
   hace la solicitud **INADMISIBLE**. La propuesta clínica no se emite; se reporta la
   observación para subsanación.
7. Cuando la vigencia dependa de una fecha, calcúlala contra la **fecha de ingreso a
   revisión**, nunca contra la fecha actual de ejecución del bot.

Salida esperada: el bloque `admisibilidad` del JSON, con un resultado por documento,
la regla citada y el resultado general.

---

# MANUAL — CHECK LIST REVISIÓN DE CASOS

## Nota transversal de ingreso  {#ingreso.representante}

Para personas con **diagnóstico de demencia** o **diagnósticos que limiten
significativamente sus capacidades cognitivas**, el trámite se debe ingresar con la
**ClaveÚnica de un representante** (NO del usuario).

---

## Cédula de identidad  {#cedula}

- **{#cedula.frontal}** Al menos por cara frontal.
- **{#cedula.legible}** Legible.
- **{#cedula.vigente}** Vigente al momento del ingreso a revisión.
- **{#cedula.coincidencia}** Los datos corresponden con los de la plataforma.
- **{#cedula.extranjero}** Cédula de extranjeros vencida: se acepta **sólo si** adjunta
  certificado de residencia en trámite vigente.

---

## Informe Biomédico Funcional (IBF)  {#ibf}

- **{#ibf.datos}** Datos del usuario: nombre y RUT.
- **{#ibf.profesional}** Completado por profesional idóneo: **Médico, Enfermera/o,
  Psicólogo/a, Kinesiólogo/a, Fonoaudiólogo/a, Terapeuta Ocupacional.**
- **{#ibf.vigencia}** Vigente: un año al momento del ingreso a revisión.
  - *Excepción cerrada:* se aceptan formularios **sin fecha de emisión** siempre y
    cuando el usuario presente patología de carácter crónico y con escasas
    posibilidades de mejoría o recuperación (ej.: Enfermedad de Parkinson, Demencia,
    TEA en adultos, Discapacidad Intelectual en adultos, enfermedades
    neurodegenerativas), **o** que adjunte exámenes y/o informes complementarios que
    comprueben el diagnóstico.
- **{#ibf.firma}** Firma y timbre legible del profesional informante.
- **{#ibf.formato}** Formato legal vigente, sin modificaciones, sin páginas cortadas.

---

## Informe Social y de Redes de Apoyo (ISRA)  {#isra}

- **{#isra.datos}** Datos del usuario: nombre y RUT.
- **{#isra.profesional}** Completado por profesional idóneo: **Trabajador/Asistente
  Social (NO técnico).**
- **{#isra.vigencia}** Vigente: un año al momento del ingreso a revisión.
  - *Excepción cerrada:* se aceptan formularios **sin fecha de emisión** siempre y
    cuando la dirección reportada en el documento coincida con la informada en la
    plataforma.
- **{#isra.firma}** Firma y timbre legible del profesional informante.
- **{#isra.formato}** Formato legal vigente, sin modificaciones, sin páginas cortadas.

---

## IVADEC  {#ivadec}

- **{#ivadec.datos}** Datos del usuario: nombre y RUT.
- **{#ivadec.vigencia}** Vigente: un año al momento del ingreso a revisión.
- **{#ivadec.firma}** Firma del calificador (profesional que aplica el instrumento).

---

## Definiciones y notas sobre firmas y timbres  {#firmas}

- **{#firmas.timbre-legible}** Se entiende como **timbre legible** que sea posible
  obtener la información de datos básicos (nombre o RUT) o institución del profesional
  que emite el documento.
- **{#firmas.puno-y-letra}** Firmas y timbres deben ser **de puño y letra**
  (no imagen insertada).

---

*Fuente: Unidad de Discapacidad COMPIN RM — "CHECK LIST REVISIÓN DE CASOS".*
