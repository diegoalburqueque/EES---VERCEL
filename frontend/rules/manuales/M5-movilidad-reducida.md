---
id: M5
nombre: Algoritmo de determinación de Movilidad Reducida (MR)
fuente: "5.- CÁLCULO MOVILIDAD REDUCIDA.pdf"
emisor: Unidad de Discapacidad COMPIN RM
tipo: manual
aplica_a: [RM, OHIGGINS, BIOBIO]
usado_por_proceso: [P5-propuesta-fundada, P7-carga-cerofilas]
version: 1.0.0
estado: transcripcion-fiel
ultima_revision: 2026-08-20
---

# PROMPT DE USO — M5

> Este bloque se entrega al modelo junto con el contenido del manual.
> M5 es un **algoritmo determinista**. No es materia de criterio clínico.

Eres el evaluador de Movilidad Reducida.

Reglas de aplicación:

1. **Nunca decidas MR por impresión clínica.** MR se resuelve **sólo** ejecutando este
   algoritmo. Si el resultado del algoritmo contradice lo que sugiere el expediente, el
   algoritmo manda y la discrepancia se reporta como observación.
2. Necesitas **exactamente dos entradas** antes de empezar:
   - **Edad** de la persona con discapacidad (años y meses; en menores de 1 año,
     meses y días).
   - **Origen de discapacidad** declarado: Físico, Sensorial Visual, Sensorial Auditivo,
     Mental Psíquico, Mental Intelectual o Múltiple.
3. Con la edad, selecciona **el tramo etario** correspondiente. Cada tramo tiene su
   propio set de preguntas P1–P4, redactadas distinto. **Usa el set del tramo correcto**;
   no mezcles preguntas entre tramos.
4. Con el origen, entra al **árbol de decisión** de ese tramo y recórrelo hasta un
   terminal: `CON MR` o `SIN MR`.
5. Las respuestas a P1–P4 son binarias: **SÍ / NO**. Provienen del ISRA, del IBF o del
   IVADEC. Si la respuesta a una pregunta necesaria **no consta**, **no adivines**: MR
   queda como `No determinable` con la observación de qué dato falta.
6. **Deja registrada la traza:** tramo etario aplicado, origen usado, respuestas a cada
   pregunta evaluada y terminal alcanzado. La propuesta debe poder auditarse.
7. Si el origen es **Múltiple** o **Sensorial Auditivo**, el resultado es inmediato y
   **no se aplican preguntas**.
8. El resultado alimenta el campo `MR:` de la propuesta *(ver [M2§propuesta.mr])*.
   Es posible proponer **agregar** o **eliminar** la MR respecto de lo declarado en el
   IVADEC, según este resultado.

Salida esperada: `MR: SI` / `MR: NO` (o `No determinable`) + traza de la decisión.

---

# MANUAL — HERRAMIENTA PARA DETERMINAR MOVILIDAD REDUCIDA (MR) EN PERSONAS CON DISCAPACIDAD

## Entradas del instrumento  {#entradas}

**1. ¿Qué edad tiene la persona con discapacidad que vive en su hogar?**
Años y meses (en menores de 1 año, referir meses y días).

**2. ¿Cuál es el origen de discapacidad (o "tipo" en certificados antiguos) referido en
el certificado de discapacidad de la persona?**
Físico · Sensorial Visual · Sensorial Auditivo · Mental Psíquico · Mental Intelectual ·
Múltiple.

---

## Reglas invariantes (todos los tramos etarios)  {#invariantes}

| Origen | Resultado |
|---|---|
| **Sensorial auditivo** | **SIN MR** — siempre, sin aplicar preguntas |
| **Múltiple** | **CON MR** — siempre, sin aplicar preguntas |

---

# TRAMO 1 — 10 AÑOS O MÁS  {#t1}

## Set de preguntas PMR  {#t1.preguntas}

- **P1.** ¿Posee usted alguna dificultad para mirar un programa de televisión de su
  interés, como por ejemplo un partido de fútbol o una teleserie?
- **P2.** ¿Posee usted alguna dificultad para ir a un lugar cercano a su domicilio, como
  por ejemplo al negocio de la esquina o a la casa de su vecino de en frente?
- **P3.** ¿Posee usted alguna dificultad para levantarse de la silla en la que está
  sentado o para acostarse en su cama?
- **P4.** ¿Posee usted alguna dificultad para vestirse?

Alternativas de respuesta: **SÍ – NO**

## Reglas MR según origen  {#t1.reglas}

- **Sensorial auditivo →** SIN MR
- **Múltiple →** CON MR
- **Sensorial visual →** P1 SÍ **y** P2 SÍ → **CON MR**; cualquier NO → **SIN MR**
- **Físico →** P3 SÍ → **CON MR**; P3 NO y P4 SÍ → **CON MR**; P3 NO y P4 NO → **SIN MR**
- **Mental psíquico / Mental intelectual →** P2 SÍ → **CON MR**; P2 NO y P4 SÍ →
  **CON MR**; P2 NO y P4 NO → **SIN MR**

---

# TRAMO 2 — 5 AÑOS A 9 AÑOS 11 MESES  {#t2}

## Set de preguntas PMR  {#t2.preguntas}

- **P1.** ¿Posee usted alguna dificultad para mirar un programa de televisión de su
  interés, como por ejemplo un partido de fútbol, una teleserie, o sus dibujos animados
  favoritos?
- **P2.** ¿Posee usted alguna dificultad para ir a un lugar cercano a su domicilio, como
  por ejemplo al negocio de la esquina o a la casa de su vecino de en frente?
- **P3.** ¿Posee usted alguna dificultad para levantarse de la silla en la que está
  sentado o para acostarse en su cama?
- **P4.** ¿Posee usted alguna dificultad para vestirse?

Alternativas de respuesta: **SÍ – NO**

## Reglas MR según origen  {#t2.reglas}

- **Sensorial auditivo →** SIN MR
- **Múltiple →** CON MR
- **Sensorial visual →** P1 SÍ **y** P2 SÍ → **CON MR**; cualquier NO → **SIN MR**
- **Físico →** P3 SÍ → **CON MR**; P3 NO y P4 SÍ → **CON MR**; P3 NO y P4 NO → **SIN MR**
- **Mental psíquico / Mental intelectual →** P2 SÍ → **CON MR**; P2 NO y P4 SÍ →
  **CON MR**; P2 NO y P4 NO → **SIN MR**

---

# TRAMO 3 — 2 AÑOS A 4 AÑOS 11 MESES  {#t3}

## Set de preguntas PMR  {#t3.preguntas}

- **P1.** ¿Posee el niño/a alguna dificultad para mirar un programa de televisión de su
  interés, como por ejemplo sus dibujos animados favoritos?
- **P2.** ¿Posee el niño/a alguna dificultad para ir de una a otra habitación dentro de
  su casa, como por ejemplo desde su pieza al baño o desde el comedor a la cocina?
- **P3.** ¿Posee el niño/a alguna dificultad para levantarse de la silla en la que está
  sentado o para acostarse en su cama?
- **P4.** ¿Posee el niño/a alguna dificultad para desvestirse, por ejemplo para sacarse
  la chaqueta o los pantalones?

Alternativas de respuesta: **SÍ – NO**

## Reglas MR según origen  {#t3.reglas}

- **Sensorial auditivo →** SIN MR
- **Múltiple →** CON MR
- **Sensorial visual →** P1 SÍ **y** P2 SÍ → **CON MR**; cualquier NO → **SIN MR**
- **Físico →** P3 SÍ → **CON MR**; P3 NO y P4 SÍ → **CON MR**; P3 NO y P4 NO → **SIN MR**
- **Mental psíquico / Mental intelectual →** P2 SÍ → **CON MR**; P2 NO y P4 SÍ →
  **CON MR**; P2 NO y P4 NO → **SIN MR**

---

# TRAMO 4 — 12 MESES A 23 MESES 29 DÍAS  {#t4}

## Set de preguntas PMR  {#t4.preguntas}

- **P1.** ¿Posee el niño/a alguna dificultad para mirar un programa de televisión de su
  interés, como por ejemplo sus dibujos animados favoritos?
- **P2.** ¿Posee el niño/a alguna dificultad para ir de una a otra habitación dentro de
  su casa, como por ejemplo desde su pieza al baño o desde el comedor a la cocina?
- **P3.** ¿Posee el niño/a alguna dificultad para levantarse de la silla en la que está
  sentado o para acostarse en su cama?
- **P4.** ¿Posee el niño/a alguna dificultad para mantenerse sentado mientras come o de
  rodillas mientras juega?

Alternativas de respuesta: **SÍ – NO**

## Reglas MR según origen  {#t4.reglas}

- **Sensorial auditivo →** SIN MR
- **Múltiple →** CON MR
- **Sensorial visual →** P1 SÍ **y** P2 SÍ → **CON MR**; cualquier NO → **SIN MR**
- **Físico →** P3 SÍ → **CON MR**; P3 NO y P4 SÍ → **CON MR**; P3 NO y P4 NO → **SIN MR**
- **Mental psíquico / Mental intelectual →** P2 SÍ → **CON MR**; P2 NO y **P3** SÍ →
  **CON MR**; P2 NO y P3 NO → **SIN MR**
  ⚠️ *En este tramo la segunda pregunta de la rama mental es **P3**, no P4.*

---

# TRAMO 5 — 6 MESES A 11 MESES 29 DÍAS  {#t5}

## Set de preguntas PMR  {#t5.preguntas}

- **P1.** ¿Posee el niño/a alguna dificultad para mirar sus dibujos animados favoritos o
  a otros niños mientras juegan?
- **P2.** ¿Posee el niño/a alguna dificultad para levantar un objeto hasta la altura de
  su cara, como por ejemplo un juguete o su mamadera?
- **P3.** ¿Posee el niño/a alguna dificultad para rodar sobre sí mismo (para pasar de la
  posición acostado de espaldas a acostado de "guatita") o para pasar de la posición de
  "gateo" (apoyo en cuatro puntos) a la posición sentado?
- **P4.** ¿Posee el niño/a alguna dificultad para mantener su tronco y cabeza erguidos
  cuando se le toma desde la cintura o para mantenerse sentado sin apoyo?

Alternativas de respuesta: **SÍ – NO**

## Reglas MR según origen  {#t5.reglas}

- **Sensorial auditivo →** SIN MR
- **Múltiple →** CON MR
- **Sensorial visual →** P1 SÍ **y** P2 SÍ → **CON MR**; cualquier NO → **SIN MR**
- **Físico →** P3 SÍ → **CON MR**; P3 NO y P4 SÍ → **CON MR**; P3 NO y P4 NO → **SIN MR**
- **Mental psíquico / Mental intelectual →** P2 SÍ → **CON MR**; P2 NO y **P3** SÍ →
  **CON MR**; P2 NO y P3 NO → **SIN MR**
  ⚠️ *En este tramo la segunda pregunta de la rama mental es **P3**, no P4.*

---

## Resumen ejecutable del algoritmo  {#pseudocodigo}

```
determinarMR(edad, origen, respuestas):
    si origen == SENSORIAL_AUDITIVO      -> SIN MR
    si origen == MULTIPLE                -> CON MR

    tramo = tramoEtario(edad)
      # T1: >= 10 años
      # T2: 5a00m .. 9a11m
      # T3: 2a00m .. 4a11m
      # T4: 12m00d .. 23m29d
      # T5: 6m00d .. 11m29d

    si origen == SENSORIAL_VISUAL:
        -> (P1 == SI y P2 == SI) ? CON MR : SIN MR

    si origen == FISICO:
        -> (P3 == SI o P4 == SI) ? CON MR : SIN MR

    si origen en (MENTAL_PSIQUICO, MENTAL_INTELECTUAL):
        segunda = (tramo en (T4, T5)) ? P3 : P4
        -> (P2 == SI o segunda == SI) ? CON MR : SIN MR

    # Cualquier respuesta requerida ausente -> "No determinable" + observación
```

> **Nota de cobertura:** el instrumento no define tramo para edades entre
> **24 meses y 1 mes**, ni bajo 6 meses, de forma explícita en el documento fuente.
> Si un caso cae fuera de los cinco tramos, no fuerces un tramo vecino: reporta
> `No determinable` e indica la edad exacta para revisión humana.

---

*Fuente: Unidad de Discapacidad COMPIN RM — "Herramienta para determinar Movilidad Reducida (MR) en personas con discapacidad".*
