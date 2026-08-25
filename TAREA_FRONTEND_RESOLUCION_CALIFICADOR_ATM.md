# Tarea Frontend — Vista de Resolución del Calificador

## Proyecto

Plataforma de Calificación COMPIN — GrupoEES / Salud 360

## Objetivo

Igualar la **vista de detalle y resolución del CALIFICADOR** de nuestra plataforma al flujo y diseño funcional del ATM de referencia, manteniendo nuestra arquitectura actual en **Next.js + React + Tailwind + PostgreSQL**.

La referencia funcional es el HTML del ATM desarrollado en Apps Script, especialmente:

- la función `pintarFicha()`;
- el bloque **“Propuesta del ATM”**;
- el bloque **“Tu resolución”**;
- los flujos de **Ratificar propuesta**, **Modificar propuesta** y **El caso no se puede evaluar**.

> Importante: no portar código de Apps Script literalmente. Hay que reproducir la experiencia, jerarquía visual y comportamiento en los componentes actuales de React/Next.js.

---

## Alcance

Esta tarea corresponde a **frontend + persistencia necesaria para la resolución humana**.

### Dentro del alcance

- Vista de detalle del caso del calificador.
- Presentación de la información proveniente de `analysis_json`.
- Tabla comparativa IVADEC vs propuesta del motor.
- Resolución del calificador.
- Ratificación.
- Modificación.
- Caso no evaluable.
- MR final.
- REEV final.
- Persistencia de la resolución humana.
- Vista read-only de casos ya resueltos.

### Fuera del alcance

- Motor Node del bot.
- Claude.
- Gemini.
- Reglas clínicas del motor.
- `AnalysisSchema`.
- Generación del `analysis.json`.
- CeroFilas.
- Automatización de asignación.

---

# 1. Regla principal de arquitectura

`casos.analysis_json` representa la **propuesta original del MOTOR**.

Esta información debe quedar **inmutable**.

Nunca debe sobrescribirse cuando el calificador ratifica o modifica la propuesta.

La separación conceptual debe ser:

```text
analysis_json
    ↓
PROPUESTA ORIGINAL DEL MOTOR
    ↓
CALIFICADOR REVISA
    ├── RATIFICA
    ├── MODIFICA
    └── NO EVALUABLE
    ↓
RESOLUCIÓN HUMANA
```

No volver a llamar a Claude/Gemini si el profesional modifica una propuesta.

---

# 2. Objetivo visual

Mantener:

- header actual;
- autenticación actual;
- navegación actual;
- estilo general de la plataforma.

Pero dentro de la ficha del caso se debe aproximar la experiencia visual del ATM.

## Diseño esperado

- Área central de aproximadamente `1100px` de ancho máximo.
- Fondo gris muy claro.
- Paneles blancos independientes.
- Bordes grises suaves.
- Títulos azules con barra vertical azul a la izquierda.
- Tablas claras para comparaciones.
- Encabezados de tabla oscuros.
- Chips de estado:
  - verde;
  - naranjo;
  - rojo;
  - gris.
- Caja destacada para la decisión final.
- Botones principales grandes y fácilmente distinguibles.

La ficha debe organizarse en este orden:

```text
A. Identificación del trámite
B. Documentos del expediente
C. Antecedentes para validar
D. Propuesta del motor
E. Puntos a revisar
F. Tu resolución
```

---

# 3. Identificación del trámite

Mostrar como mínimo:

- ID trámite.
- Nombre del usuario.
- RUT.
- Región.
- Fecha de procesamiento, si está disponible.
- Origen declarado/propuesto, si está disponible.
- Movilidad reducida, si está disponible.

Debe ser un panel compacto al inicio de la ficha.

---

# 4. Documentos del expediente

Mostrar enlaces a los documentos disponibles:

- Cédula.
- IBF.
- ISRA.
- IVADEC.
- Complementarios.

Si falta un documento obligatorio, debe mostrarse una alerta visible.

Los documentos deben poder abrirse en una pestaña nueva.

---

# 5. Antecedentes para validar

Consumir la información ya disponible en `analysis_json`.

No recalcular clínicamente en frontend.

## 5.1 Antecedentes sociales relevantes

Mostrar, cuando existan:

- ISRA completado por.
- Nivel educativo.
- Trabajo / ocupación.
- Situación familiar.
- Grado de limitación.
- Situación especial.
- Otros antecedentes sociales relevantes.

## 5.2 Datos relevantes de calificación — IBF

Mostrar:

- Profesional / IBF completado por.
- Diagnóstico principal.
- Diagnósticos secundarios.
- Resumen de información relevante.
- Descripción del estado funcional.
- Medicamentos.
- Ayudas técnicas.

## 5.3 Informes y exámenes complementarios

Mostrar cada complementario disponible con:

- documento;
- fecha;
- hallazgo;
- relación con IBF.

Mostrar resumen de concordancia cuando corresponda.

## 5.4 IVADEC

Mostrar:

- Calificador IVADEC.
- Aplicado a.
- Porcentaje obtenido.
- IDIS.
- Grado.
- Orígenes considerados.

## 5.5 Observaciones IVADEC

Mostrar el listado completo de observaciones relevantes disponibles en `analysis_json`.

## 5.6 Movilidad reducida

Mostrar el resultado generado por el motor y, cuando exista información suficiente:

- resultado;
- ruta/regla aplicada;
- actividades/lecturas relevantes;
- alertas asociadas.

---

# 6. Propuesta del motor

Crear un panel específico llamado:

**Propuesta del motor**

Debe incluir una tabla comparativa:

| | IDIS | Porcentaje | Grado |
|---|---:|---:|---|
| Según IVADEC-CIF | ... | ... | ... |
| Propuesta MOTOR | ... | ... | ... |

Debajo mostrar:

- Acción/dictamen sugerido.
- Reglas u observaciones relevantes aplicadas.
- Fundamento breve de la propuesta.
- Origen principal propuesto.
- Orígenes secundarios propuestos.
- Movilidad reducida propuesta.
- Reevaluación propuesta.

Los datos deben provenir del `analysis_json`.

El frontend no debe realizar inferencias clínicas.

---

# 7. Puntos a revisar

Crear un panel **Puntos a revisar** cuando existan elementos relevantes.

Debe poder mostrar:

- Alertas prioritarias.
- Observaciones QA.
- Discordancias.
- Diferencias menores de identidad.
- Advertencias de carga.
- Observaciones relacionadas con IVADEC.
- Información de guía clínica cuando corresponda.

El objetivo es que el calificador pueda validar el caso sin tener que revisar todos los documentos salvo cuando sea necesario.

---

# 8. Tu resolución

Crear un panel final llamado:

**Tu resolución**

Debe replicar funcionalmente el comportamiento del ATM.

## Campos permanentes

### Movilidad reducida (MR) final

Select:

```text
SÍ
NO
```

Precargar con la propuesta del motor cuando sea posible.

### Reevaluación (REEV) final

Select inicialmente con:

```text
NO
EN 3 AÑOS
EN 5 AÑOS
EN 6 AÑOS
EN 10 AÑOS
```

Precargar con la propuesta del motor cuando sea posible.

## Acciones principales

Mostrar:

```text
[Ratificar propuesta]
[Modificar propuesta]
[El caso no se puede evaluar]
```

---

# 9. Ratificar propuesta

Significa que el profesional acepta la propuesta del motor.

Antes de guardar debe aparecer una confirmación explícita.

Ejemplo:

```text
Vas a ratificar la propuesta del motor y cerrar el trámite.
¿Confirmas?
```

Debe registrar:

```text
decision = ACEPTA
modificado = false
movilidadReducida = valor final seleccionado
reevaluacion = valor final seleccionado
calificador
fecha
```

No modificar `analysis_json`.

La propuesta original del motor debe mantenerse para trazabilidad.

---

# 10. Modificar propuesta

Al presionar **Modificar propuesta**, desplegar una caja debajo de la resolución, similar al ATM.

## 10.1 Motivo

Campo obligatorio.

Debe ser un `select` con catálogo configurable.

No hardcodear el texto de los motivos dentro del componente si existe o se puede crear un catálogo central.

## 10.2 Porcentaje final

NO utilizar un input libre.

El usuario sólo puede seleccionar porcentajes válidos de la tabla oficial IDIS.

Cada opción debe mostrarse aproximadamente así:

```text
50% · IDIS 2.0 · SEVERO
52,5% · IDIS 2.1 · SEVERO
...
```

Usar los 41 valores oficiales de la tabla IDIS.

El porcentaje seleccionado debe determinar automáticamente:

- IDIS final.
- Grado final.

No usar IA para esa relación.

## 10.3 Dirección resultante

Mostrar inmediatamente al cambiar el porcentaje:

```text
Dirección resultante:
SE MANTIENE respecto del IVADEC
```

ó:

```text
SE AUMENTA respecto del IVADEC
```

ó:

```text
SE DISMINUYE respecto del IVADEC
```

### Regla crítica

La comparación debe hacerse entre:

```text
PORCENTAJE FINAL DEL CALIFICADOR
vs
PORCENTAJE ORIGINAL DEL IVADEC
```

NO comparar contra la propuesta del motor.

Ejemplo:

```text
IVADEC       50%
Motor        60%
Calificador  60%

Resultado = SE AUMENTA
```

porque la comparación operacional es:

```text
50 → 60
```

## 10.4 Fundamento

Textarea obligatorio.

Mínimo sugerido:

```text
20 caracteres
```

Placeholder aproximado:

```text
Explica qué antecedente del expediente sustenta una decisión distinta a la propuesta del motor.
```

## 10.5 Datos de resolución modificada

Guardar como mínimo:

```text
decision = MODIFICA
porcentajeFinal
idisFinal
gradoFinal
direccion
motivo
fundamento
movilidadReducida
reevaluacion
calificador
fecha
```

No modificar `analysis_json`.

---

# 11. El caso no se puede evaluar

Agregar la tercera opción del ATM:

**El caso no se puede evaluar**

No confundir esto con un rechazo clínico.

Un caso no evaluable significa que no existen antecedentes suficientes o confiables para emitir una resolución.

Al seleccionarlo mostrar:

## Causa

Select obligatorio desde catálogo configurable.

## Detalle

Textarea obligatorio.

Mínimo sugerido:

```text
20 caracteres
```

Mensaje previo a confirmar:

```text
No se emitirá propuesta. El caso pasará a revisión administrativa.
¿Confirmas?
```

Debe persistirse como una resolución distinta de `ACEPTA` y `MODIFICA`.

Por ejemplo:

```text
decision = NO_EVALUABLE
causa
fundamento/detalle
calificador
fecha
```

---

# 12. Ficha editada

Puede mantenerse el mecanismo actual de:

```text
casos.ficha_editada
casos.ficha_editada_en
casos.ficha_editada_por
```

como borrador/autosave de la interfaz.

Pero conceptualmente mantener:

```text
analysis_json   = propuesta original del motor
ficha_editada   = borrador/trabajo del humano
resolución      = decisión final del humano
```

Nunca utilizar `ficha_editada` para sobrescribir el `analysis_json`.

---

# 13. Caso ya resuelto

Cuando el caso ya esté finalizado:

- toda la ficha debe quedar en modo read-only;
- no mostrar botones de resolución activos;
- mostrar claramente la resolución registrada.

Debe visualizarse:

- RATIFICADO / MODIFICADO / NO EVALUABLE.
- Porcentaje final.
- IDIS final.
- Grado final.
- Dirección final.
- MR final.
- REEV final.
- Motivo, cuando corresponda.
- Fundamento, cuando corresponda.
- Nombre del calificador.
- Fecha de resolución.

Si fue modificado, idealmente mostrar también la comparación:

```text
IVADEC → MOTOR → CALIFICADOR
```

Ejemplo:

```text
IVADEC       50%
MOTOR        60%
CALIFICADOR  55%
```

---

# 14. Compatibilidad con el frontend actual

Actualmente existe una vista de detalle que usa:

- `FichaEditable`;
- `analysis_json`;
- `confirmarPropuesta()`;
- `modificarYCalificar()`;
- `guardarFicha()`.

No reescribir todo desde cero.

Reutilizar componentes y flujo existentes donde sea razonable.

La implementación debe evolucionar el detalle actual hacia el flujo ATM.

---

# 15. Persistencia

El compañero encargado de frontend/BBDD debe definir la persistencia necesaria para soportar la resolución completa.

Actualmente la lógica de modificación considera principalmente el porcentaje final.

La nueva resolución debe ser capaz de persistir también:

- decisión;
- porcentaje final;
- IDIS final;
- grado final;
- dirección;
- MR final;
- REEV final;
- motivo;
- fundamento;
- causa de no evaluable cuando corresponda;
- calificador;
- fecha.

La propuesta original del motor debe permanecer disponible para comparación posterior.

---

# 16. No hacer

No hacer ninguna de estas acciones dentro de esta tarea:

- No modificar el motor Node.
- No modificar Claude.
- No modificar Gemini.
- No cambiar `AnalysisSchema`.
- No regenerar `analysis_json` cuando el profesional modifica.
- No tomar decisiones clínicas en frontend.
- No copiar literalmente el código Apps Script.
- No llamar nuevamente a IA desde la resolución del calificador.
- No sobrescribir la propuesta original del motor.

---

# 17. Validaciones UX mínimas

Antes de finalizar una resolución:

### Ratificación

- Confirmación explícita.

### Modificación

Requerir:

- motivo seleccionado;
- porcentaje válido de tabla IDIS;
- fundamento de mínimo 20 caracteres;
- MR seleccionado;
- REEV seleccionado.

### No evaluable

Requerir:

- causal;
- descripción de mínimo 20 caracteres.

Mientras se guarda:

- deshabilitar botones;
- mostrar estado `Guardando...`;
- evitar doble envío.

Si falla:

- mostrar mensaje de error;
- conservar los datos ingresados.

---

# 18. Entrega esperada

Al finalizar entregar:

1. Archivos modificados.
2. Componentes creados.
3. Tipos TypeScript creados/modificados.
4. Cambios de BBDD/migraciones aplicadas o propuestas.
5. Endpoints modificados/creados.
6. Explicación de cómo se mantiene `analysis_json` inmutable.
7. Explicación de dónde queda persistida la resolución humana.
8. Captura o descripción de los estados:
   - Ratificar.
   - Modificar.
   - No evaluable.
   - Caso ya resuelto.
9. Resultado de:

```bash
npm run build
```

10. Resultado de:

```bash
npm run lint
```

11. Riesgos o pendientes detectados.

---

# 19. Criterios de aceptación

La tarea se considera terminada cuando:

- [ ] La vista se aproxima visualmente al ATM de referencia.
- [ ] El calificador puede leer el expediente estructurado sin abrir documentos en condiciones normales.
- [ ] Existe tabla comparativa IVADEC vs MOTOR.
- [ ] Existe panel “Tu resolución”.
- [ ] MR es seleccionable.
- [ ] REEV es seleccionable.
- [ ] Se puede ratificar.
- [ ] Se puede modificar.
- [ ] Se puede declarar no evaluable.
- [ ] El porcentaje modificado sólo admite valores oficiales IDIS.
- [ ] IDIS y grado se derivan determinísticamente.
- [ ] Mantiene/aumenta/disminuye se calcula respecto del IVADEC original.
- [ ] Modificar exige motivo y fundamento.
- [ ] No evaluable exige causa y detalle.
- [ ] `analysis_json` nunca se modifica.
- [ ] La resolución humana queda persistida aparte.
- [ ] Los casos finalizados quedan read-only.
- [ ] No se llama nuevamente a IA al modificar.
- [ ] Build pasa correctamente.
- [ ] Lint pasa correctamente.

