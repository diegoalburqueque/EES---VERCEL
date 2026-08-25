---
id: M3
nombre: Guía clínica — información requerida por diagnóstico
fuente: "3.- GUÍA CLÍNICA PARA ELABORACIÓN DE PROPUESTA DE CALIFICACIÓN DE DISCAPACIDAD.pdf"
emisor: Unidad de Discapacidad COMPIN RM
tipo: manual
aplica_a: [RM, OHIGGINS, BIOBIO]
usado_por_proceso: [P3-datos-calificacion, P4-checklist-qa, P5-propuesta-fundada, P6-admisibilidad]
depende_de: [M4]
version: 1.0.0
estado: transcripcion-fiel
ultima_revision: 2026-08-20
---

# PROMPT DE USO — M3

> Este bloque se entrega al modelo junto con el contenido del manual.
> M3 responde: **¿qué información clínica debe traer el IBF para cada diagnóstico,
> qué complementario hay que rescatar y qué origen de discapacidad corresponde?**

Eres el analista clínico que evalúa la suficiencia del expediente.

Reglas de aplicación:

1. Para **cada diagnóstico** informado en el IBF, busca su cuadro en este manual y
   contrasta punto por punto: **profesional habilitado**, **contenido mínimo del
   informe**, **complementarios a rescatar** y **origen de discapacidad**.
2. Si el IBF fue completado por un profesional **no habilitado** para ese diagnóstico
   (ej.: epilepsia informada por médico general cuando el manual exige Neurólogo),
   levanta la observación citando la regla. No la des por válida.
3. Si falta contenido mínimo, indica **exactamente qué elemento falta**
   (ej.: "no consigna frecuencia de crisis ni fecha de la última crisis").
4. Los ítems de la columna **Rescatar** son los complementarios/escalas que debes
   buscar activamente en el expediente y reportar según **[M2§complementarios]**.
   Su ausencia se observa; no se inventa el valor.
5. El **origen de discapacidad** que indica este manual es el que corresponde
   clínicamente. Si el IVADEC declara un origen distinto sin sustento, es base para
   proponer su modificación o eliminación.
6. Cuando un diagnóstico **no esté en este manual**, aplica el criterio general:
   informe actualizado de profesional idóneo que describa diagnóstico, evolución,
   tratamiento y **repercusión funcional**. Deja constancia de que el diagnóstico no
   tiene cuadro específico en M3.
7. **No diagnostiques.** Tu tarea es verificar suficiencia documental y coherencia,
   no emitir un diagnóstico propio ni completar el que falta.
8. Redacta los diagnósticos siempre con la nomenclatura de **[M4]**.

Salida esperada: hallazgos de suficiencia clínica que alimentan el checklist QA y el
fundamento de la propuesta.

---

# MANUAL — INFORMACIÓN CLÍNICA REQUERIDA EN IBF O EN INFORMES COMPLEMENTARIOS

> Abreviaturas de profesional: **Méd. Gral./Esp.** = Médico general o especialista ·
> **T.O.** = Terapeuta Ocupacional · **Klgo.** = Kinesiólogo/a ·
> **Flgo.** = Fonoaudiólogo/a · **Psic.** = Psicólogo/a · **Enf.** = Enfermero/a ·
> **Psiq.** = Psiquiatra.

---

## ACV secuelado  {#acv}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** tipo y fecha del ACV, causa, evolución, tratamientos y
  rehabilitación realizada o pendiente. Debe especificar secuelas motoras, sensitivas,
  cognitivas, visuales, conductuales, del lenguaje, habla o deglución; alteraciones de
  marcha y equilibrio; dependencia en actividades de la vida diaria y asistencia de
  terceros.
- **Rescatar:** Epicrisis · Ayuda Técnica · Índice de Barthel · Índice de Lawton y
  Brody · Escala de Rankin modificada.
- **Origen:** dependiendo de la secuela.

---

## Amputaciones  {#amputaciones}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** causa, fecha, extremidad, lateralidad y nivel anatómico de la
  amputación; estado, dolor residual o fantasma, uso y adaptación de prótesis, ayudas
  técnicas y rehabilitación. Debe señalar las limitaciones que ésta produce.
- **Rescatar:** Epicrisis o Protocolo Operatorio · Ayuda técnica que utiliza.
- **Origen:** FÍSICO.

---

## Artrosis  {#artrosis}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** articulación comprometida, lateralidad, tiempo de evolución,
  gravedad, dolor, rigidez, limitación del rango articular, deformidades, alteración de
  fuerza, marcha y equilibrio; tratamientos realizados, respuesta, cirugías indicadas o
  pendientes.
- **Rescatar:** Informe imagenológico de la articulación afectada · Epicrisis o
  Protocolo Operatorio · Ayuda Técnica.
- **Origen:** FÍSICO.

---

## Cáncer  {#cancer}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** informe oncológico actualizado con diagnóstico específico,
  localización, estadio y extensión de la enfermedad; evolución clínica; tratamientos
  realizados, actuales y pendientes; respuesta terapéutica; pronóstico; secuelas y
  compromiso funcional asociado.
- **Rescatar:** Informe Anátomo Patológico · Secuelas específicas según el órgano
  comprometido · Escala ECOG · Índice de Karnofsky.
- **Origen:** FÍSICO.

---

## Enfermedades cardíacas (ICC, arritmias, infarto agudo del miocardio, etc.)  {#cardiacas}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** diagnóstico, evolución y gravedad de la enfermedad; función
  cardíaca objetiva (disnea, fatiga, angina, palpitaciones, síncope, intolerancia al
  esfuerzo y limitaciones para las actividades de la vida diaria); tratamiento realizado
  y actual; eventos cardiovasculares relevantes y repercusión en las actividades de la
  vida diaria.
- **Rescatar:** Ecocardiograma · Capacidad funcional · Clasificación funcional NYHA.
- **Origen:** FÍSICO.

---

## Enfermedades respiratorias (EPOC, LCFA, asma, fibrosis pulmonar, etc.)  {#respiratorias}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** diagnóstico y evolución de la enfermedad respiratoria, grado de
  severidad, pruebas de función pulmonar, exacerbaciones, tratamiento realizado y
  actual, y repercusión funcional, incluyendo limitación para el esfuerzo y actividades
  de la vida diaria.
- **Rescatar:** Espirometría · VEF1 (% predicho) · Saturación de O₂ · Necesidad de O₂ ·
  TAC de tórax.
- **Origen:** FÍSICO.

---

## Demencia / Deterioro cognitivo / Trastorno neurocognitivo  {#demencia}

- **Profesional:** Neurólogo/a, Psiquiatra, Geriatra o Médico/a tratante del Programa de
  Salud Mental, Programa de Memoria, Programa de Atención Domiciliaria a Personas con
  Dependencia Severa (Postrados) o PADI.
  *Es admisible si se indica que es parte de alguno de estos programas.*
- **Debe describir:** tipo y causa del trastorno neurocognitivo, gravedad, tiempo de
  evolución, compromiso de memoria y otras funciones cognitivas, síntomas conductuales o
  emocionales, tratamientos y pronóstico. Debe especificar repercusión en la autonomía,
  seguridad, manejo de medicamentos y dinero, orientación, actividades de la vida
  diaria, necesidad de supervisión y asistencia de terceros.
- **Rescatar:** Índice de Barthel · Escala de Lawton y Brody · Cuestionario de Pfeiffer ·
  MMSE, MoCA · **debe identificarse al informante o cuidador** · Informe de neuroimagen ·
  Ayuda Técnica.
- **Origen:** MENTAL PSÍQUICO.
- **Relacionado:** el ingreso del trámite debe hacerse con ClaveÚnica de un
  representante *(ver [M1§ingreso.representante])*.

---

## Daño orgánico cerebral  {#daño-cerebral}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** causa, diagnóstico neurológico, fecha de inicio, localización y
  extensión de la lesión, evolución y carácter estable o progresivo. Debe describir
  secuelas cognitivas, conductuales, motoras, sensitivas, visuales, del lenguaje, habla
  o deglución; presencia de epilepsia; tratamientos, rehabilitación, ayudas técnicas,
  autonomía y necesidad de supervisión o asistencia de terceros.
- **Rescatar:** Índice de Barthel · Escala de Lawton y Brody · Informe de neuroimagen ·
  Ayuda Técnica.
- **Origen:** MENTAL PSÍQUICO.

---

## Discapacidad intelectual  {#di}

- **{#di.6-18}** **De 6 a 18 años:** Psicometría (WAIS-WISC) **o** informe descriptivo
  de Psicólogo que indique grado de Discapacidad Intelectual (ej.: leve, moderada,
  severa).
- **{#di.mayores-18}** **Mayores de 18:** Psicometría (WAIS) **o** informe descriptivo
  de Psicólogo **o** informe de Psiquiatra **o** Neurólogo **o** Médico de Programa de
  Salud Mental.
- **{#di.sin-psicometria}** Se aceptarán diagnósticos de especialistas que especifican
  el CI **sin psicometría: sólo por neurólogo o psiquiatra con informe descriptivo**.
- **Origen:** MENTAL INTELECTUAL.
- **Ver también:** [M3§sindromes] (síndromes genéticos que permiten origen mental
  intelectual sin psicometría) y [M4§di] (nomenclatura).

---

## Trastorno del Espectro Autista (TEA)  {#tea}

- **Profesional:** Psiquiatra o Neurólogo.
- **Debe describir:** fundamentos del diagnóstico, **nivel de apoyo requerido —1, 2 o
  3—**, desarrollo cognitivo y del lenguaje, comorbilidades, tratamientos, medicamentos
  y evolución. Debe especificar limitaciones.
- **Rescatar:** Autocuidado · Aprendizaje · Flexibilidad · Desregulaciones ·
  Participación familiar, escolar, social o laboral · Necesidad de supervisión.
- **Origen:** MENTAL PSÍQUICO.

---

## Depresión / Trastorno mixto de ansiedad y depresión  {#depresion}

- **Profesional:** Psiq. / Méd. de Programa de Salud Mental, Psic.
- **Debe describir:** diagnóstico específico, gravedad, fecha de inicio, evolución,
  recurrencias, síntomas actuales, comorbilidades, riesgo suicida, hospitalizaciones,
  tratamientos farmacológicos y psicoterapéuticos, adherencia, respuesta, efectos
  adversos y pronóstico. Debe especificar la repercusión en la funcionalidad.
- **Rescatar:** Autocuidado · Concentración · Relaciones interpersonales · Participación
  social · Desempeño educativo o laboral.
- **Origen:** MENTAL PSÍQUICO.

---

## Trastorno bipolar, trastorno esquizoafectivo, trastornos de la personalidad, esquizofrenia  {#psiquiatricos-mayores}

- **Profesional:** Psiq. / Méd. de Programa de Salud Mental, Psic.
- **Debe describir:** diagnóstico, fecha de inicio, evolución, síntomas actuales,
  descompensaciones, episodios afectivos o psicóticos, hospitalizaciones,
  comorbilidades, consumo de sustancias, tratamiento farmacológico y psicosocial,
  adherencia, respuesta, efectos adversos y pronóstico. Debe especificar la repercusión
  en la funcionalidad.
- **Rescatar:** Autocuidado · Concentración · Relaciones interpersonales · Participación
  social · Desempeño educativo o laboral · Manejo del dinero · Necesidad de supervisión
  o asistencia de terceros.
- **Origen:** MENTAL PSÍQUICO.

---

## Trastornos por abuso de sustancias  {#sustancias}

- **Profesional:** Psiq. / Méd. de Programa de Salud Mental, Psic.
- **Debe describir:** sustancias consumidas, patrón, gravedad y tiempo de evolución;
  fecha del último consumo, períodos de abstinencia, recaídas, episodios de intoxicación,
  abstinencia o sobredosis, hospitalizaciones y tratamientos realizados. Debe describir
  comorbilidades psiquiátricas y médicas, secuelas cognitivas, neurológicas o físicas,
  adherencia, respuesta terapéutica y pronóstico.
- **Rescatar:** Autocuidado · Desempeño laboral · Relaciones familiares y sociales ·
  Necesidad de supervisión · Manejo de dinero.
- **Origen:** MENTAL PSÍQUICO.

---

## Enfermedad de Parkinson  {#parkinson}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** fecha de inicio, evolución, etapa de la enfermedad, síntomas
  motores y no motores, fluctuaciones "on-off", discinesias, alteraciones de marcha y
  equilibrio, caídas, compromiso cognitivo, del habla o deglución; tratamientos,
  respuesta y rehabilitación.
- **Rescatar:** Índice de Barthel · Escala de Lawton y Brody · Ayuda Técnica ·
  Necesidad de supervisión o asistencia de terceros.
- **Origen:** FÍSICO.

---

## Enfermedad renal crónica en diálisis  {#erc}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** causa de la enfermedad renal, etapa, fecha de inicio y modalidad
  de diálisis —hemodiálisis o peritoneodiálisis—, frecuencia, acceso vascular o
  peritoneal, adherencia, tolerancia, complicaciones, hospitalizaciones, tratamientos y
  eventual condición para trasplante.
- **Rescatar:** Hemodiálisis · Diálisis peritoneal · Condición para trasplante · Informe
  nefrológico · Ceroteca.
- **Origen:** FÍSICO.

---

## Epilepsia  {#epilepsia}

- **Profesional:** **Neurólogo.**
- **Debe describir:** tipo y causa de la epilepsia, edad de inicio, características,
  frecuencia y duración de las crisis, alteración de conciencia, fecha de la última
  crisis, período posictal, lesiones asociadas, episodios de estatus epiléptico,
  factores desencadenantes y grado de control. Debe señalar tratamiento, adherencia,
  respuesta, efectos adversos, hospitalizaciones, comorbilidades cognitivas o
  conductuales y necesidad de supervisión.
- **Rescatar:** Electroencefalograma · Informe de neuroimagen · Necesidad de supervisión.
- **Origen:** MENTAL PSÍQUICO.

---

## Fibromialgia  {#fibromialgia}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** tiempo de evolución, dolor generalizado, fatiga, alteraciones del
  sueño y cognitivas, síntomas asociados, comorbilidades, tratamientos farmacológicos y
  no farmacológicos, adherencia, respuesta y pronóstico. Debe especificar la repercusión
  en la movilidad, tolerancia al esfuerzo, actividades de la vida diaria y desempeño
  social o laboral.
- **Rescatar:** Índice de dolor generalizado (WPI) · Repercusiones de la movilidad ·
  Tratamiento farmacológico.
- **Origen:** FÍSICO.

---

## Hipoacusia  {#hipoacusia}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **{#hipoacusia.audiometria}** **Debe contar con Audiometría.**
- **{#hipoacusia.ges}** Se aceptará **GES confirmado** en lugar de audiometría, sólo si
  cuenta con diagnóstico confirmado que indique **lateralidad y severidad**.
- **{#hipoacusia.secundario}** En caso de que sea un **diagnóstico secundario**, se
  aceptará informe diagnóstico de Otorrinolaringología, sin audiometría, a cualquier
  edad.
- **{#hipoacusia.menores}** **Menores sin lenguaje:** potencial evocado auditivo o
  examen BERA.
- **Rescatar:** Audiometría · Potencial evocado.
- **Origen:** SENSORIAL AUDITIVO.

---

## Disautonomía  {#disautonomia}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe aportar:** resultado de la prueba de mesa basculante (**Tilt Test**) y/o
  informe cardiológico complementario actualizado que fundamente el diagnóstico y
  describa su repercusión funcional.
- **Rescatar:** Tilt Test.
- **Origen:** FÍSICO.

---

## Artritis reumatoide  {#ar}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** tiempo de evolución, articulaciones comprometidas, actividad de la
  enfermedad, dolor, rigidez matinal, inflamación, deformidades, pérdida de fuerza y
  rango articular; manifestaciones extraarticulares, tratamientos realizados y actuales,
  adherencia, respuesta, cirugías, ayudas técnicas y pronóstico.
- **Rescatar:** Informe imagenológico de la articulación afectada · Epicrisis o
  Protocolo Operatorio · Ayuda Técnica.
- **Origen:** FÍSICO.

---

## Patologías de columna  {#columna}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** diagnóstico, segmento comprometido —cervical, dorsal o lumbar—,
  causa, tiempo de evolución, dolor, limitación de movilidad, alteraciones de fuerza o
  sensibilidad, radiculopatía, compromiso medular, marcha, tratamientos realizados,
  respuesta, cirugías, rehabilitación, ayudas técnicas y pronóstico. Debe especificar la
  repercusión en las actividades de la vida diaria y la necesidad de asistencia de
  terceros.
- **Rescatar:** Informe imagenológico RX, TAC, Resonancia · Electromiografía · Ayuda
  Técnica.
- **Origen:** FÍSICO.

---

## Síndrome de Tourette  {#tourette}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** edad de inicio, tipos de tics motores y vocales, frecuencia,
  intensidad, duración, variabilidad, capacidad de supresión, factores desencadenantes,
  lesiones o dolor asociados y evolución.
- **Rescatar:** Repercusión en las actividades de la vida diaria (relaciones sociales y
  desempeño escolar o laboral) · Escala Global de Gravedad de Tics de Yale (YGTSS).
- **Origen:** MENTAL PSÍQUICO.

---

## Obesidad mórbida u obesidad clase III  {#obesidad}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** peso, talla, índice de masa corporal (IMC), tiempo de evolución,
  tratamientos realizados, respuesta y eventual indicación de cirugía bariátrica. Debe
  describir comorbilidades y complicaciones metabólicas, cardiovasculares,
  respiratorias, osteoarticulares o psicológicas, además de limitaciones para la marcha,
  movilidad, autocuidado y actividades de la vida diaria.
- **Rescatar:** Indicar IMC · Autocuidado · Ayuda Técnica.
- **Origen:** FÍSICO.

---

## VIH  {#vih}

- **Profesional:** Méd. Gral./Esp. y/o T.O., Klgo., Flgo., Psic. o Enf.
- **Debe describir:** fecha de diagnóstico, etapa clínica, tratamiento antirretroviral,
  adherencia, respuesta y efectos adversos, infecciones oportunistas, neoplasias,
  hospitalizaciones, comorbilidades y secuelas neurológicas, cognitivas, físicas o
  nutricionales. Debe especificar la repercusión en las actividades de la vida diaria y
  desempeño social o laboral.
- **Rescatar:** Desempeño social y laboral · Autocuidado · Funciones cognitivas ·
  Síndrome consuntivo.
- **Origen:** FÍSICO.
- **Nomenclatura:** consignar como `B24 EN TARV` *(ver [M4§vih])*.

---

## Visual  {#visual}

- **Documentación aceptada:** Informe de Oftalmólogo **o** agudeza visual (con
  corrección) **o** informe de campo visual **o** receta de lentes **o** fondo de ojo.
- **{#visual.ceguera-legal}** Si el oftalmólogo indica **CEGUERA LEGAL con patología
  asociada**: evaluar y pasar a comisión, **no pedir agudeza visual**.
- **{#visual.menores}** **Menores:** potencial evocado visual.
- **Cuando no hay agudeza visual:**
  - **{#visual.vr-sin-patologia}** Vicio de refracción (VR) **sin** patología asociada:
    **se rechaza**, no constituye discapacidad. Si quiere apelar debe adjuntar agudeza
    visual.
  - **{#visual.vr-con-patologia}** VR **con** patología asociada: evaluar funcionalidad
    y determinar porcentaje.
  - **{#visual.casos-2024}** Casos antiguos asociados a VR (ingresados el 2024): aplicar
    tabla de agudeza visual para valoración, evaluar y pasar a comisión, no pedir
    agudeza visual. La comisión podría pedir adjuntar agudeza visual, dependiendo del
    caso.
- **Origen:** SENSORIAL VISUAL.

---

## Afasia  {#afasia}

- **Profesional:** Neurólogo o Fonoaudiólogo.
- **Debe describir:** la causa —ACV, traumatismo, tumor, enfermedad neurodegenerativa u
  otra—, fecha de inicio, tipo y gravedad de la afasia, evolución, tratamientos y
  rehabilitación. Debe describir el compromiso de comprensión, expresión oral,
  denominación, repetición, lectura y escritura, además de su repercusión en la
  comunicación cotidiana, autonomía y participación social o laboral.
- **{#afasia.consignacion}** La afasia debe consignarse como una **secuela o trastorno
  del lenguaje, identificando siempre la enfermedad que la origina**.
- **Rescatar:** Informe de neuroimagen · Autonomía · Repercusión en las actividades de
  la vida diaria · Necesidad de asistencia de terceros.
- **Origen:** MENTAL PSÍQUICO.

---

# Síndromes genéticos con origen MENTAL INTELECTUAL sin psicometría  {#sindromes}

> **Patologías que cursan con discapacidad intelectual y su grado de severidad pueden
> ser consideradas con origen MENTAL INTELECTUAL sin considerar psicometría.**

## 1. Severidad profunda a severa  {#sindromes.severos}

*Dependencia casi total — compromiso cognitivo profundo + múltiples comorbilidades.*

- **Síndrome de Patau:** DI profunda · malformaciones graves (SNC, cardíacas) · alta
  mortalidad precoz.
- **Síndrome de Edwards:** DI severa · compromiso multisistémico · sobrevida muy
  limitada.
- **Síndrome de Angelman:** DI severa–profunda · lenguaje muy limitado o ausente ·
  epilepsia + alteración motora.
- **Síndrome de Rett:** regresión neurológica · pérdida de habilidades adquiridas ·
  dependencia progresiva.
- **Síndrome de Cornelia de Lange:** DI moderada a severa · malformaciones múltiples ·
  compromiso conductual importante · alta dependencia.
- **Síndrome de Aicardi:** DI severa a profunda · epilepsia de difícil manejo ·
  compromiso neurológico grave · dependencia total.
- **Síndrome de Cri du Chat:** DI moderada a severa · retraso global del desarrollo ·
  lenguaje muy limitado · alta dependencia funcional.
- **Síndrome de Smith-Lemli-Opitz:** DI moderada a severa · malformaciones congénitas ·
  trastornos conductuales · dependencia variable (frecuente apoyo continuo).

## 2. Severidad leve–moderada  {#sindromes.leves}

- **Síndrome de Down:** DI leve–moderada, puede llegar a ser límite · buen desarrollo
  social · pueden lograr autonomía parcial.
- **Síndrome de Williams:** DI leve–moderada, en algunos casos puede ser límite · perfil
  cognitivo desigual · mayor autonomía que otros síndromes.
- **Síndrome de Prader-Willi:** DI leve–moderada, en algunos casos límite · gran impacto
  conductual (hiperfagia, impulsividad) · alta dependencia en autocuidado.
- **Síndrome de Kabuki:** DI leve a moderada, en algunos casos límite · retraso del
  desarrollo · buen potencial de adaptación · autonomía parcial con apoyo.
- **Síndrome X frágil:** DI moderada a normal bajo · frecuente asociación con TEA ·
  dificultades conductuales relevantes · **evaluar caso a caso, deben traer psicometría
  o IBF de especialista** · la DI es común, pero no siempre presente o con distinta
  severidad.

## 3. Otros diagnósticos  {#sindromes.otros}

- **Síndrome de Noonan:** normal a límite.
- **Esclerosis tuberosa:** normal o límite.
- **Neurofibromatosis tipo 1:** normal o límite.
- **Síndrome de Turner:** DI rara.
- **Microcefalia:** variable.
- **Hidrocefalia congénita:** variable.
- **Trastornos metabólicos** (muchos cursan con DI si no se tratan precozmente):
  Fenilcetonuria · Hipotiroidismo congénito · Enfermedad de Tay-Sachs.

---

*Fuente: Unidad de Discapacidad COMPIN RM — "GUÍA CLÍNICA PARA ELABORACIÓN DE PROPUESTA DE CALIFICACIÓN DE DISCAPACIDAD".*
