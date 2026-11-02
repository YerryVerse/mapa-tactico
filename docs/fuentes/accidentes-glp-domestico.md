# Investigación preparatoria: cilindro doméstico de GLP

Consulta de fuentes: 20 de octubre de 2026. Estado: investigación y propuesta de contenido; no es una ficha publicada ni acredita el cierre de operaciones del Sprint 4. Relación con el plan: 4A-02/04/05 y 4B-03/04/05. Los valores calculados se guardan en `accidentes-glp-domestico-referencias.json`.

## Resultado de la investigación

La primera entrada propuesta es **Cilindro doméstico de GLP**, distinguiendo el combustible del recipiente. GLP designa una mezcla, no una sustancia de composición única: NIOSH enumera propano, propileno, butanos y butilenos. La composición de una carga concreta requiere una fuente del producto. [NIOSH, ficha de GLP](https://www.cdc.gov/niosh/npg/npgd0679.html).

Para describir el accidente hay que separar estos mecanismos:

| Mecanismo | Qué describe la ficha |
| --- | --- |
| Fuga seguida de incendio | Combustión del gas liberado; puede haber llama o llamarada sin ruptura del cilindro. |
| Explosión de gas acumulado | Combustión con aumento de presión; el entorno y el confinamiento condicionan el resultado. |
| Ruptura con expansión del líquido, BLEVE | Fallo del recipiente y expansión rápida; con combustible inflamable puede acompañarse de incendio y fragmentos. No toda explosión de gas es un BLEVE. |

La guía de HSE diferencia incendios, explosiones de nube de vapor y BLEVE, exige justificar modelos y advierte sobre las incertidumbres de las consecuencias. Es una referencia industrial de mecanismos; no proporciona una curva universal para cilindros de vivienda. [HSE, guía de evaluación de GLP, criterios 3.3 y 3.5](https://www.hse.gov.uk/comah/assets/docs/lpg.pdf).

## Medidas que deben mantenerse separadas

| Magnitud | Unidad | Uso propuesto |
| --- | --- | --- |
| Masa neta de combustible | kg; lb como presentación secundaria | Identificar cuánto gas se supone o se documenta, excluyendo tara. |
| Energía química de combustión | MJ; kWh como equivalencia energética | Comparación didáctica con base termodinámica declarada. |
| Potencia | kW o MW | Solo si existe una duración o tasa de liberación respaldada; no es sinónimo de energía. |
| Consecuencias físicas del accidente | Magnitudes observadas o publicadas y su procedencia | No se deducen automáticamente de la masa nominal ni del calor de combustión. |

Recomendación de producto: usar **Energía química de referencia** como etiqueta, evitando presentar esa cifra como potencia explosiva. Una equivalencia energética con TNT tampoco establecería igualdad de onda, daños o fragmentación. La investigación actual no valida radios ni porcentajes de lesión.

## Referencia numérica reproducible

NIST TN 2126, tabla 4.10, p. 355 impresa (página 364 del PDF), distingue calor neto y bruto, a 298,15 K. Para combustible gaseoso: propano, −2042,69 y −2218,66 kJ/mol; n-butano, −2657,31 y −2877,28 kJ/mol. Como referencias redondeadas: propano 46,3 MJ/kg netos y 50,3 brutos; n-butano 45,7 y 49,5. No intercambiar bases ni estados de fase. [NIST TN 2126](https://doi.org/10.6028/NIST.TN.2126).

Ejemplos calculados para **propano gaseoso de referencia**, combustión completa y base neta; no son energías mecánicas de explosión ni mediciones de un accidente:

| Masa supuesta de combustible | Energía química neta aproximada | Equivalencia energética |
| --- | --- | --- |
| 5 kg | 232 MJ | 64 kWh |
| 25 lb = 11,33980925 kg | 525 MJ | 146 kWh |
| 15 kg | 695 MJ | 193 kWh |

El cálculo propio es `masa × calor neto específico`; `1 kWh = 3,6 MJ`. La masa molar del propano, 44,0956 g/mol, procede del [NIST Chemistry WebBook](https://webbook.nist.gov/cgi/cbook.cgi?Name=propane&cTC=on&cTG=on&cTP=on). La conversión de libra avoirdupois es 0,45359237 kg por libra. [NIST, referencias de masa](https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir4941.pdf).

## Particularidades dominicanas

El documento RTD 69, edición 2012 alojada por INDOCAL, diferencia capacidad de agua, carga de GLP y tara. Sus tablas 9 y 10 no son totalmente coherentes al relacionar kg con 25 lb: aparecen 11,35 kg y 11 kg. No usar una etiqueta comercial como medición exacta del gas restante ni confundir volumen del recipiente con masa de combustible. Esta consulta no certifica la vigencia regulatoria de esa edición. [INDOCAL, RTD 69, definiciones y tablas 9–10](https://indocal.gob.do/download/2046/reglamentos-tecnicos-dominicanos/48516/rtd-69-glp-2-da-rev-2012.pdf).

## Antecedente de cilindro pequeño

WA FACE documentó en 2016 un incendio mortal relacionado con una fuga de un cilindro nominal de 20 lb en un puesto de café. Sirve como antecedente de fuga e incendio con recipiente pequeño. No es un accidente de vivienda, ni prueba de BLEVE, ni medición de sobrepresión; la capacidad nominal no acredita el contenido remanente. [Informe WA FACE / NIOSH](https://stacks.cdc.gov/view/cdc/164968).

## Propuesta para la primera ficha

Nombre: **Cilindro doméstico de GLP**. Identidad propuesta: `domestic-lpg-cylinder-reference`. Tipo: explicación de un tipo de accidente, separada de un registro histórico. Mostrar mecanismo, combustible y composición conocida o desconocida, masa de referencia, energía química con base explícita y fuentes. La referencia de 25 lb es una propuesta ilustrativa, no una medición de un cilindro real ni una elección del usuario ya aprobada.

La acción principal propuesta es **Explorar caso**. La ubicación libre aporta contexto territorial; cualquier población consultada conserva área y año propios. Una secuencia visual debe explicar el mecanismo sin presentar círculos arbitrarios como huellas verificadas. Para publicar una reconstrucción cuantificada faltan un caso o ensayo pertinente, datos de entrada documentados, validación del modelo y su incertidumbre. La consulta histórica no debe trasladar víctimas a otra ubicación.

La preparación de esta fuente no sustituye traducción y revisión en veinte idiomas, implementación, pruebas ni aprobación de los sprints previos. No se modificó el portal durante esta investigación.
