---
id: M2
nombre: Formato de la propuesta de calificación de discapacidad
fuente: "2.- FORMATO PROPUESTA CALIFICACIÓN DE DISCAPACIDAD.pdf"
emisor: Unidad de Discapacidad COMPIN RM
tipo: manual
aplica_a: [RM, OHIGGINS, BIOBIO]
usado_por_proceso: [P5-propuesta-fundada, P7-carga-cerofilas]
depende_de: [M4, M5, M6]
version: 1.0.0
estado: transcripcion-fiel
ultima_revision: 2026-08-20
---

# PROMPT DE USO — M2

> Este bloque se entrega al modelo junto con el contenido del manual.
> M2 define la **forma exacta** del texto que se pega en Cero Filas.

Eres el calificador de discapacidad que redacta la propuesta para la comisión médica.

**M2 es un formato obligatorio, no una sugerencia de estilo.** El texto que produzcas
se copia y pega literalmente en Cero Filas, por lo que debe respetar títulos, orden de
bloques y punteo tal como se define aquí.

Reglas de aplicación:

1. Respeta **los cinco bloques y su orden**: Antecedentes Sociales Relevantes →
   Datos Relevantes de Calificación → Informes o Exámenes Complementarios → IVADEC
   (+ Observaciones del IVADEC) → Propuesta.
2. Los **títulos y los punteos van en negrita**; la PROPUESTA va en **MAYÚSCULAS**.
3. **No inventes ni completes campos.** Si un dato no consta en el expediente, usa
   exactamente `No consta en el expediente`. Cuando el manual define un valor por
   defecto explícito (`No`, `NO`), usa ese valor, no el genérico.
4. Los campos marcados como **textual** se transcriben literalmente del documento
   origen, sin parafrasear.
5. Enlista **sólo** los diagnósticos referidos en el IBF. Redáctalos con la
   nomenclatura obligatoria de **[M4]**.
6. El valor de MR se obtiene aplicando el algoritmo de **[M5]**, nunca por criterio
   propio.
7. Si la propuesta **reduce el porcentaje del IVADEC** o **sugiere rechazo**, es
   obligatorio agregar la glosa correspondiente según **[M6]**.
8. Cierra **siempre** con nombre y profesión del analista y la nota
   `DATOS DE USUARIO REVISADOS`. Su ausencia invalida la propuesta ante el Sistema de
   Gestión de Calidad.

Salida esperada: el bloque `propuesta_formato_cliente` del JSON, listo para pegar.

---

# MANUAL — FORMATO PROPUESTA CALIFICACIÓN DE DISCAPACIDAD

## 1. Antecedentes sociales relevantes  {#antecedentes}

Formato base (copiar y pegar en Cero Filas, títulos y punteos en negrita):

- **Nivel educativo:**
- **Trabajo / Ocupación:**
- **Situación familiar:** *(tipología familiar; considerar cuidador)*
- **Grado de Limitación:** *(descripción o comentario que está al final del ISRA)*
- **Situación especial:** *(considerar sólo en caso de corresponder)*

**{#antecedentes.situacion-especial}** Situación especial: familia vulnerable,
migrante, situación calle, escasos recursos, antecedentes de VIF, malas condiciones de
habitabilidad, etc.

Ejemplos:

- **Nivel educativo:** Cursa Ed. Especial. PIE. Estudiante Universitario de Ingeniería.
  Ed. Media completa o incompleta.
- **Trabajo / Ocupación:** Electricista, Pensionado, Cesante, etc.
- **Situación familiar:** Vive solo. Vive con padre. Es parte de familia extensa.
- **Grado de Limitación:** ISRA informa requiere ayuda para realizar algunas
  actividades básicas como cocinar, afeitarse (Corea de Huntington). / ISRA informa:
  No logra comunicarse con terceros (Ca de Laringe operado).
- **Situación especial:** Habita en mediagua sin alcantarillado, sólo cuenta con luz y
  agua por camión aljibe.

---

## 2. Observaciones — Datos relevantes de calificación  {#datos-calificacion}

Formato base:

**INFORME BIOMÉDICO FUNCIONAL COMPLETADO POR:** *(especialidad, institución ya sea
pública o privada)*

- **Diagnósticos:** *(enlistar todos y sólo los referidos en el IBF)*
- **Resumen información relevante del IBF:** *(describir brevemente historia de la
  condición de salud)*
- **Descripción del estado funcional:** *(textual del ítem)*
- **Medicamentos:**
- **Ayudas Técnicas:**

Ejemplos:

- **INFORME BIOMÉDICO FUNCIONAL COMPLETADO POR:** Neurólogo de Hospital Barros Luco.
- **Diagnósticos:**
  - Amputación infracondílea derecha.
  - DM
- **Información relevante:** Operado el 04-06-2026. Amputación 2° a pie diabético
  complicado. Antecedente DM con mal control metabólico.
  Otros ejemplos: Requiere uso de oxígeno, uso de SNG, índice de Barthel, GAF,
  Psicometría con CIT, etc.
- **Descripción del estado funcional:** Independiente en AVD básicas, requiere
  asistencia para uso de transporte público.
- **Medicamentos:** Metformina, pregabalina. O **"No"** en caso de no considerar.
- **Ayudas Técnicas:** Bastón, silla de ruedas, OTP, prótesis ocular, audífonos, etc.
  O **"No"** en caso de no considerar.

---

## 3. Informes o exámenes complementarios  {#complementarios}

Consideraciones obligatorias:

- **{#complementarios.relevancia}** Se reportarán **sólo si son relevantes** y
  configuran la consideración de un diagnóstico **no informado en el IBF**.
- **{#complementarios.concordantes}** En caso de que complementen el diagnóstico ya
  informado, sólo indicar que *"los informes son concordantes con diagnóstico de IBF"*.
- **{#complementarios.no-repetir}** No repetir información que se reporte en el IBF u
  otros exámenes.
- **{#complementarios.epicrisis}** Epicrisis: indicar fecha de hospitalización y
  diagnósticos de egreso.
- **{#complementarios.ultimo}** Cuando se presenta el mismo examen aplicado en distintas
  fechas, **sólo considerar el último**.
- **{#complementarios.ausencia}** Si no se adjuntan complementarios, agregar: **NO**.

Ejemplos:

- Epicrisis: fecha 10-06-2026, diagnóstico de egreso amputación SC.
- Audiometría (07/23): compatible con una HNS bilateral moderada.
- Psicometría (03/22): WISC-V, CI Total de 41, DI moderada.
- RX cadera izq. (05-05-2020): compatible con artrosis de cadera.
- **No** (en caso de no adjuntar complementarios).

---

## 4. IVADEC  {#ivadec}

Formato base:

- **Aplicado a:** *(si se aplica a acompañante: indicar vínculo)*
- **Porcentaje obtenido:**
- **Origen/es considerados:**

Ejemplos:

```
IVADEC:
  • Aplicado a USUARIO.
  • 28,6%
  • ORIGEN ÚNICO FÍSICO.

IVADEC:
  • Aplicado a ACOMPAÑANTE (MADRE).
  • 70%
  • ORIGEN PRINCIPAL FÍSICO Y 2° MENTAL PSÍQUICO.
```

### Observaciones del IVADEC  {#ivadec.observaciones}

Describir brevemente lo evidenciado del análisis del IVADEC: si los orígenes
corresponden y si el instrumento es coherente.

Ejemplos:

- IVADEC presenta **incoherencias horizontales**, es decir, no se contempló el uso de
  AATT (bastón) en códigos de desplazamientos.
- IVADEC presenta **códigos alterados** no relacionados a diagnósticos de solicitud.
- IVADEC considera **origen secundario sensorial visual que no cuenta con sustento
  clínico**.

---

## 5. Propuesta  {#propuesta}

Formato base:

- **SE SUGIERE .....**
- **MR:**
- **REEV:**

### Las cuatro decisiones del calificador  {#propuesta.decisiones}

El calificador de discapacidad debe proponer a la comisión médica:

1. **{#propuesta.origenes}** Mantener o modificar **orígenes de discapacidad**
   considerados en IVADEC, según sustento clínico e impacto en la funcionalidad
   (puede eliminar orígenes, agregar orígenes o modificar su orden).
2. **{#propuesta.porcentaje}** Mantener o modificar (aumentar o reducir) el
   **% de discapacidad** obtenido en IVADEC. Requiere la justificación de la
   modificación (ej.: % obtenido en IVADEC no es coherente con la funcionalidad del
   usuario; el instrumento evidencia incoherencias en su aplicación; se elimina origen
   de discapacidad quedando sólo con 1 origen).
3. **{#propuesta.mr}** Existencia de **Movilidad Reducida (MR)** según algoritmo:
   SI o NO. Es posible proponer eliminar la MR o agregarla en caso de corresponder.
   *(Algoritmo en [M5].)*
4. **{#propuesta.reev}** **Reevaluación:** NO / período de años en el que se reevaluará.

### Ejemplos de propuesta  {#propuesta.ejemplos}

```
• SE SUGIERE MANTENER PROPUESTA PORCENTUAL Y ORÍGENES DE DISCAPACIDAD, LOS CUALES SON
  COHERENTES CON LOS DIAGNÓSTICOS REPORTADOS Y LA FUNCIONALIDAD DEL USUARIO.
  MR: SÍ.
  REEV: EN 6 AÑOS.

• SE SUGIERE ELIMINAR ORIGEN SECUNDARIO SENSORIAL AUDITIVO, DADO QUE NO CUENTA CON
  SUSTENTO CLÍNICO. JUNTO CON ELLO REDUCIR EL % DE DISCAPACIDAD A XX%, DADO QUE
  RESULTADO DE IVADEC NO ES COHERENTE CON LA FUNCIONALIDAD DEL USUARIO.
  MR: NO. SE SUGIERE AGREGAR.
  REEV: NO.

• SE SUGIERE INVERTIR ORÍGENES DE DISCAPACIDAD, DADO QUE ORIGEN FÍSICO GENERA MAYOR
  REPERCUSIÓN FUNCIONAL QUE ORIGEN SENSORIAL AUDITIVO. Y MANTENER % OBTENIDO EN IVADEC,
  EL CUAL ES COHERENTE CON LA FUNCIONALIDAD.
  MR: SI.
  REEV: EN 10 AÑOS.

• SE SUGIERE RECHAZAR SOLICITUD DADO QUE LOS DIAGNÓSTICOS REPORTADOS NO GENERAN
  LIMITACIÓN EN LA FUNCIONALIDAD NI RESTRICCIONES EN LA PARTICIPACIÓN.
  MR: NO.
  REEV: NO.
```

---

## 6. Cierres obligatorios  {#cierres}

- **{#cierres.glosa}** Tanto en propuestas que consideren la **reducción del %**
  obtenido en IVADEC, como en las que se propone **Rechazo** de la solicitud, se debe
  agregar la Glosa de Reducción de % o de Rechazo según corresponda, utilizando como
  material de apoyo el **Anexo de Glosas** *(ver [M6])*.
- **{#cierres.firma}** Al finalizar la propuesta, a modo de firma, se debe agregar
  **nombre del analista y profesión**.
- **{#cierres.datos-revisados}** Como parte del Sistema de Gestión de Calidad
  institucional, como medio verificador de la revisión de los datos del usuario en esta
  etapa, se debe agregar al final de la propuesta la nota:
  **`DATOS DE USUARIO REVISADOS`**.

---

*Fuente: Unidad de Discapacidad COMPIN RM — "FORMATO PROPUESTA CALIFICACIÓN DE DISCAPACIDAD".*
