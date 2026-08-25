---
id: M4
nombre: Nomenclatura obligatoria de diagnósticos
fuente: "4.- PAUTA ELABORACIÓN DE DIAGNÓSTICOS.pdf"
emisor: Unidad de Discapacidad COMPIN RM
tipo: manual
aplica_a: [RM, OHIGGINS, BIOBIO]
usado_por_proceso: [P3-datos-calificacion, P5-propuesta-fundada, P7-carga-cerofilas]
depende_de: [M3]
version: 1.0.0
estado: transcripcion-fiel
ultima_revision: 2026-08-20
---

# PROMPT DE USO — M4

> Este bloque se entrega al modelo junto con el contenido del manual.
> M4 responde: **¿cómo se ESCRIBE cada diagnóstico?** No decide si hay discapacidad
> (eso es [M3]); decide la redacción exacta.

Eres el redactor de diagnósticos de la propuesta de calificación.

Reglas de aplicación:

1. **Regla estructural general:** se consigna **primero la secuela, después la patología
   de origen**, unidas por `2° A`.
   Ejemplo: `ALTERACIÓN DE LA MARCHA 2° A COXARTROSIS BILATERAL`.
2. Los diagnósticos se escriben en **MAYÚSCULAS**.
3. Especifica siempre, cuando aplique: **segmento, lateralidad, tipo, grado de
   severidad y etapa**. Si el antecedente no lo reporta, **no lo inventes**: omite el
   atributo y levanta la observación de que el IBF no lo consigna.
4. Cuando este manual indica **"consignar tal como se indica"** o **"consignar tal como
   se reporta"**, usa el texto literal de la lista. No sustituyas por sinónimos, no
   traduzcas siglas ni "mejores" la redacción.
5. Enlista **sólo los diagnósticos referidos en el IBF** *(ver [M2§datos-calificacion])*.
6. Aplica las reglas de decisión de la sección final: **[M4§metabolicas]** (rechazo) y
   **[M4§di]** (CI limítrofe). Estas cambian el resultado de la propuesta, no sólo su
   redacción.
7. Si un diagnóstico no tiene patrón en este manual, aplica la regla estructural
   general y déjalo consignado como redacción no normada.

Salida esperada: la lista de diagnósticos normalizada, lista para el bloque
`propuesta_formato_cliente` y para la carga en Cero Filas.

---

# MANUAL — PAUTA ELABORACIÓN DE DIAGNÓSTICOS RECURRENTES

## ACV / TEC / Tumor cerebral  {#acv-tec-tumor}

Patrón: `<SECUELA> 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`

- `HEMIPARESIA (INDICAR LATERALIDAD) 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `ALTERACIÓN DE LA MARCHA 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `PARESIA BRAQUIAL (INDICAR LATERALIDAD) 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `PARESIA CRURAL (INDICAR LATERALIDAD) 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `HEMIANOPSIA HOMÓNIMA (INDICAR LATERALIDAD) 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `CEGUERA / CEGUERA LEGAL / BAJA VISIÓN (INDICAR LATERALIDAD) 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `HIPOACUSIA (INDICAR TIPO, GRADO Y LATERALIDAD) 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `ATAXIA 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `AFASIA 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `TRASTORNO DE LA DEGLUCIÓN CON USO DE SNG/GTT 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`
- `DETERIORO COGNITIVO 2° A ACV / TEC / TUMOR CEREBRAL OPERADO`

---

## Cáncer  {#cancer}

- **{#cancer.etapa-iv}** Cuando se encuentra en **etapa IV o metastásico**, se debe
  consignar como tal y, en caso de presentar secuelas, indicarlas en los diagnósticos
  secundarios.
- **{#cancer.etapas-previas}** Cuando se trata de patologías en **etapas previas**, se
  debe indicar la **secuela actual** de dicha patología.
- **{#cancer.remision}** Cuando se trata de un **cáncer operado o en remisión**, se debe
  indicar la secuela de la patología o de los tratamientos realizados.

Ejemplos:

- `LIMITACIÓN FUNCIONAL DE ESD 2° A MASTECTOMÍA TOTAL EN CONTEXTO DE CÁNCER DE MAMA`
- `CÁNCER CERVICOUTERINO EN ETAPA IV`
- `CÁNCER PULMONAR CON METÁSTASIS ÓSEAS`
- `POLINEUROPATÍA SENSITIVO MOTORA 2° A QUIMIOTERAPIA EN CONTEXTO DE CÁNCER RENAL EN REMISIÓN`
- `CÁNCER DE COLON OPERADO CON USO DE COLOSTOMÍA`
- `CÁNCER DE VEJIGA CON USO DE CUP (CATÉTER URINARIO PERMANENTE)`
- `DOLOR CRÓNICO DE (SEGMENTO AFECTADO) 2° A RADIOTERAPIA POR CÁNCER DE (SEGMENTO AFECTADO)`
- `AMPUTACIÓN TRANSTIBIAL DERECHA 2° A OSTEOSARCOMA`
- `HIPOACUSIA SEVERA OD OTOTÓXICA 2° A QUIMIOTERAPIA POR CÁNCER RENAL`

---

## Amputaciones  {#amputaciones}

Patrón: `AMPUTACIÓN (INDICAR SEGMENTO) (INDICAR LATERALIDAD) 2° A: <CAUSA>`

Causas frecuentes: pie diabético complicado · isquemia crítica · herida cortante ·
herida de bala · trauma · gangrena · osteosarcoma · etc.

**{#amputaciones.segmentos}** Segmentos válidos: de primer ortejo, transmetatarsiana,
de medio pie, transmaleolar, transtibial, transfemoral, tipo desarticulación de cadera,
IFD, IFP, de dedos largos, de pulgar, de muñeca, de antebrazo, de codo, transhumeral,
desarticulación de hombro.

---

## Patologías de columna  {#columna}

Indicar **siempre la secuela y luego la patología osteoarticular y su segmento**.

- `DOLOR CRÓNICO 2° A DISCOPATÍAS DEGENERATIVAS DORSALES MULTISEGMENTARIAS`
- `CERVICOBRAQUIALGIA BILATERAL 2° A DISCOPATÍAS Y ESPONDILOARTROSIS CERVICAL`
- `SÍNDROME DE DOLOR LUMBAR CRÓNICO 2° A ARTROSIS Y DISCOPATÍAS L4-L5 Y L5-S1`
- `ALTERACIÓN DE LA MARCHA 2° A HNP L5-S1 CON RADICULOPATÍA`
- `LIMITACIÓN DE MOVILIDAD 2° A HNP LUMBARES OPERADAS CON ARTRODESIS`
- `DOLOR CRÓNICO 2° A FX DE L1 OPERADA`
- `LIMITACIÓN DE MOVILIDAD DE COLUMNA CERVICAL 2° A SD DE ARNOLD CHIARI TIPO 1`

---

> **Los diagnósticos detallados a continuación deberán ser consignados tal como se
> indica.**

## Trastornos del movimiento  {#movimiento}

- `ENFERMEDAD DE PARKINSON`
- `DISTONÍA`
- `ATAXIA CEREBELOSA`
- `ATAXIA HEREDITARIA`
- `ENFERMEDAD DE HUNTINGTON`
- `TEMBLOR ESENCIAL`
- `PARKINSONISMO`

## Patologías autoinmunes  {#autoinmunes}

- `ARTRITIS REUMATOIDEA`
- `ARTRITIS PSORIÁSICA`
- `ESCLERODERMIA`
- `ESPONDILITIS ANQUILOSANTE`
- `LUPUS ERITEMATOSO SISTÉMICO`
- `MIASTENIA GRAVIS`
- `POLIMIOSITIS / DERMATOMIOSITIS`
- `SÍNDROME DE SJÖGREN`
- `COLITIS ULCEROSA`

## Enfermedad renal  {#renal}

Indicar **etapa y requerimiento de hemo o peritoneodiálisis**.
Ej.: `ERC ETAPA V EN HD`

## Trasplantes  {#trasplantes}

`INMUNOSUPRESIÓN CRÓNICA EN CONTEXTO DE TRASPLANTE (INDICAR ÓRGANO)`

## Epilepsia  {#epilepsia}

Consignar tal como se reporta en antecedentes:

- `EPILEPSIA`
- `EPILEPSIA FOCAL`
- `EPILEPSIA REFRACTARIA`
- `EPILEPSIA ESTRUCTURAL`
- `EPILEPSIA GENERALIZADA`

## Dependencia funcional  {#dependencia}

Según **puntaje de Barthel**, o debe contar con reporte **"literal"** dentro de
antecedentes clínicos:

- `DEPENDENCIA FUNCIONAL SEVERA`
- `DEPENDENCIA FUNCIONAL MODERADA`

## Síndrome de Down  {#down}

- **Menores de 7 años:** `SÍNDROME DE DOWN` · `RDSM ASOCIADO A SD DE DOWN`
- **Mayores de 7 años (con psicometría):**
  `DISCAPACIDAD INTELECTUAL (INDICAR GRADO) 2° A SD DE DOWN`

## Cardíacos  {#cardiacos}

- `INSUFICIENCIA CARDIACA CONGESTIVA CF (INDICAR GRADO: I, II, III O IV)`
- `CARDIOPATÍA CORONARIA`
- `INSUFICIENCIA CARDÍACA 2° A IAM`

---

## Patologías osteoarticulares  {#osteoarticulares}

Consignar **segmento, lateralidad y grado**. En caso de reportar secuelas, éstas deben
ir **al comienzo** del diagnóstico.

- `GONARTROSIS (INDICAR LATERALIDAD) (INDICAR GRADO SI ES QUE SE REPORTA)`
- `COXARTROSIS (INDICAR LATERALIDAD) (INDICAR GRADO SI ES QUE SE REPORTA)`
- `ALTERACIÓN DE LA MARCHA 2° A COXARTROSIS BILATERAL`
- `DOLOR CRÓNICO DE PIE IZQUIERDO 2° A ARTROSIS POSTRAUMÁTICA`
- `LIMITACIÓN FUNCIONAL DE EESS 2° A SD DE MANGUITO ROTADOR BILATERAL`
- `LIMITACIÓN FUNCIONAL DE MANO IZQUIERDA 2° A SD DE TÚNEL CARPIANO`

---

## Poliomielitis  {#polio}

Se debe consignar la **secuela y el segmento afectado**.

- `ALTERACIÓN DE LA MARCHA 2° A POLIOMIELITIS`
- `DISMETRÍA DE EEII 2° A POLIOMIELITIS`
- `ACORTAMIENTO DE EID 2° A POLIOMIELITIS`
- `ALTERACIÓN DE LA MARCHA 2° A ATROFIA MUSCULAR DE EII EN CONTEXTO DE POLIOMIELITIS`
- `PARESIA DE EID 2° A POLIOMIELITIS`
- `LIMITACIÓN FUNCIONAL DE ESD 2° A POLIOMIELITIS`

---

## Secuelas traumáticas  {#traumaticas}

Indicar **secuela y luego los segmentos afectados** por el traumatismo.

- `TETRAPLEJÍA 2° A TRM CERVICAL ASIA A`
- `PARAPARESIA 2° A TRM NIVEL L2-L3 OPERADO`
- `VEJIGA E INTESTINO NEUROGÉNICOS 2° A TRM`
- `LIMITACIÓN FUNCIONAL DE MANO IZQUIERDA 2° A FX DE MUÑECA OPERADA`
- `ALTERACIÓN DE LA MARCHA 2° A FX DE TIBIA DERECHA`
- `ARTROSIS POSTRAUMÁTICA DE TOBILLO IZQUIERDO 2° A FX OPERADA`
- `IMPOTENCIA FUNCIONAL DE ESD 2° A FX DE HÚMERO CON LESIÓN COMPLETA DE PLEXO BRAQUIAL`
- `LIMITACIÓN FUNCIONAL DE MANO DERECHA 2° A HERIDA CORTANTE CON LESIÓN DE NERVIO CUBITAL`
- `LIMITACIÓN DE MOVILIDAD DE ESD 2° A QUEMADURA`

---

## Parálisis cerebral  {#pc}

Debe indicar **tipo** (espástica, mixta, atáxica, discinética), **topografía** (hemi,
para, tetra, di y monoplejía o paresia) y **lateralidad** según corresponda.

- `PC TIPO HEMIPARESIA ESPÁSTICA DERECHA`
- `PC TIPO DIPLEJÍA ESPÁSTICA IZQUIERDA`
- `PC TIPO TETRAPARESIA MIXTA`

---

## Patologías respiratorias  {#respiratorias}

Indicar **diagnóstico y requerimiento de soporte vital o AATT**, en caso de requerirlo.

- `EPOC OXÍGENODEPENDIENTE`
- `SAHOS CON USO DE CPAP NOCTURNO`
- `FIBROSIS PULMONAR`
- `INSUFICIENCIA RESPIRATORIA CRÓNICA CON VMI POR TQT`

---

## VIH / SIDA  {#vih}

**{#vih.resguardo}** Por resguardo de la información clínica, se debe consignar como:

- `B24 EN TARV` *(si corresponde)*

---

## Usuarios con uso de equipos de soporte vital  {#soporte-vital}

Se debe indicar el **diagnóstico asociado** y luego **"CON USO DE xxxx"**.

- `DISPLASIA BRONCOPULMONAR CON USO DE VMI POR TQT`
- `TRASTORNO DE LA DEGLUCIÓN CON USO DE GTT/SNG`
- `FIBROSIS PULMONAR CON USO DE OXÍGENO DOMICILIARIO/OXIGENODEPENDIENTE`

---

## Patologías auditivas  {#auditivas}

Se debe indicar **tipo** (neurosensorial, conductiva, mixta), **lateralidad**
(derecha/izquierda, bilateral) y **grado de severidad** (leve, moderado, severo,
profundo).

- `HIPOACUSIA NEUROSENSORIAL BILATERAL SEVERA`
- `HIPOACUSIA MIXTA BILATERAL SEVERA`
- `HIPOACUSIA NEUROSENSORIAL: SEVERA OD, MODERADA OI`
- `ANACUSIA OI, HIPOACUSIA NEUROSENSORIAL SEVERA OD`
- `HIPOACUSIA NEUROSENSORIAL BILATERAL SEVERA CON IC (IMPLANTE COCLEAR)`

---

## Patologías visuales  {#visuales}

Se debe indicar **clasificación de agudeza visual con corrección** (visión subnormal,
baja visión, ceguera legal, ceguera) `2° A <PATOLOGÍA VISUAL>`.

- `CEGUERA LEGAL BILATERAL 2° A ALTA MIOPÍA`
- `CEGUERA LEGAL OD, BAJA VISIÓN OI 2° A RETINOPATÍA DIABÉTICA PROLIFERATIVA`
- `BAJA VISIÓN BILATERAL 2° A DESPRENDIMIENTO DE RETINA`
- `CEGUERA OI 2° A TRAUMA OCULAR`

**{#visuales.ceguera-legal}** Ceguera legal: si el oftalmólogo indica ceguera legal con
patología asociada, evaluar y considerar diagnóstico, **no pedir agudeza visual**.

**{#visuales.sin-av}** Cuando no hay agudeza visual (AV):

a. **Vicio de refracción (VR) sin patología asociada: se rechaza**, no constituye
   discapacidad. Si quiere apelar debe adjuntar agudeza visual.
b. **VR con patología asociada:** evaluar funcionalidad y determinar porcentaje.
c. **Casos antiguos asociados a VR (ingresados el 2024):** aplicar tabla de agudeza
   visual para valoración, evaluar y pasar a comisión, no pedir agudeza visual. La
   comisión podría pedir adjuntar agudeza visual, dependiendo del caso.

**Nota:** la discapacidad visual (vicios de refracción) se debe evaluar con la mejor
corrección óptica posible, teniendo siempre en cuenta el contexto biopsicosocial.

---

## Discapacidad intelectual  {#di}

Se debe indicar **grado de severidad** (leve, moderado, severo, profundo) o
**funcionamiento intelectual limítrofe**.

- **{#di.no-especificada}** `DISCAPACIDAD INTELECTUAL NO ESPECIFICADO` — en caso de no
  adjuntar psicometría o no reportar el grado.
- **{#di.sindrome}** Si la DI está asociada a síndrome genético:
  `DISCAPACIDAD INTELECTUAL (GRADO DE SEVERIDAD) ASOCIADO A (SÍNDROME GENÉTICO)`
  Ej.: `DISCAPACIDAD INTELECTUAL MODERADA ASOCIADA A SÍNDROME DE DOWN`
- **{#di.limitrofe}** ⚠️ **COEFICIENTE INTELECTUAL LIMÍTROFE NO ES UNA CONDICIÓN DE
  SALUD QUE GENERE DISCAPACIDAD.**

---

## Demencias  {#demencias}

Se debe indicar el tipo de demencia según reporte clínico:

- `DEMENCIA`
- `DEMENCIA TIPO ALZHEIMER`
- `DEMENCIA VASCULAR`
- `DEMENCIA MIXTA`
- `TRASTORNO NEUROCOGNITIVO MAYOR`
- `DETERIORO COGNITIVO`
- etc.

---

## Trastornos psiquiátricos  {#psiquiatricos}

Consignar según **nomenclatura DSM-V**:

- `TRASTORNO MENTAL Y DEL COMPORTAMIENTO POR ABUSO DE SUSTANCIAS`
- `TRASTORNO BIPOLAR`
- `TRASTORNO ESQUIZOAFECTIVO`
- `TRASTORNO PSICÓTICO`
- `ESQUIZOFRENIA HEBEFRÉNICA`
- `ESQUIZOFRENIA CATATÓNICO-PARANOIDE`

---

# Reglas de decisión — patologías metabólicas  {#metabolicas}

> ⚠️ Estas reglas **cambian el resultado de la propuesta**, no sólo su redacción.

- **{#metabolicas.secuelas}** Las patologías metabólicas **no constituyen una causa de
  discapacidad por sí solas**, a menos que generen secuelas en la funcionalidad:
  amputaciones 2° a DM, ACV por causa embólica o por HTA, neuropatías 2° a DM,
  retinopatía diabética/hipertensiva o glaucoma, etc.
- **{#metabolicas.rechazo}** En caso de presentar **únicamente** patologías como HTA,
  Diabetes Mellitus, dislipidemia, hipotiroidismo, asma, etc., **sin indicar secuelas o
  compromiso funcional secundario, se debe sugerir RECHAZO del trámite.**
- **{#metabolicas.demencia}** En casos de **demencia** que además presenten HTA y/o DM
  y/o hipotiroidismo, es posible **agregar origen físico 2°** y dejar registrado como
  diagnóstico/s secundario/s.
  *(Criterio clínico agregado por equipo de médicos contralores.)*

---

*Fuente: Unidad de Discapacidad COMPIN RM — "PAUTA ELABORACIÓN DE DIAGNÓSTICOS RECURRENTES PARA PROPUESTA DE CALIFICACIÓN DE DISCAPACIDAD".*
