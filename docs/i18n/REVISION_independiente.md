# Revisión independiente de textos y acciones

Fecha: 11 de octubre de 2026. Revisora: agente IA Codex `/root/catalogos_latin`. Se revisaron los 83 valores españoles y los 83 ingleses contra su uso en `Portal.tsx`, `Globe.tsx`, `ContextCard.tsx`, `InformationContent.tsx`, `DisclaimerContent.tsx`, los límites de `search-contract.ts` y las funciones de `locale-format.ts`. También se leyó cada valor de chino simplificado, japonés, árabe, urdu, punyabí occidental y ruso; esos catálogos fueron escritos por otro agente. El ruso se incorporó a la revisión cuando apareció su archivo. Total revisado: 664 valores en ocho catálogos. La revisión es independiente de la primera traducción de esos archivos, pero sigue siendo una revisión por IA, sin certificación humana ni nativa.

## Hallazgos para corregir en integración

| ID | Archivo y clave | Hallazgo concreto | Recomendación |
| --- | --- | --- | --- |
| L-01 | `es.json`: `mapLabel` | «+ o − para acercar» atribuye la misma acción a ambos signos. En el portal, − disminuye el zoom. | «Mapa mundial. Flechas para mover y + o − para acercar o alejar.» |
| L-02 | `en.json`: `nuclearTitle` | «Nuclear humanitarian consequences» es comprensible, pero omite el objeto explícito de las consecuencias y suena poco natural. La ficha trata del uso de armas nucleares. | «Humanitarian consequences of nuclear weapons». La equivalente española puede aclararse como «Consecuencias humanitarias de las armas nucleares». |
| L-03 | `ur.json`: `query` | «تلاش کا متن» significa texto de búsqueda. La clave no etiqueta una entrada de texto: se usa como título del estado `execution` mientras carga la ficha. | Usar un título de solicitud de información, por ejemplo «معلومات کی درخواست». |
| L-04 | `pnb-Arab.json`: `query` | «لبھن والا متن» significa texto que se busca. Tiene el mismo desajuste con el estado de carga de ficha. | Usar un título de consulta de información, por ejemplo «معلومات دی پُچھ گِچھ». Conservar punyabí y no reemplazarlo por urdu. |
| L-05 | `ja.json`: `query` | «検索条件» significa condiciones de búsqueda, pero el estado no muestra condiciones ni realiza una búsqueda geográfica. | «資料の取得», coherente con la obtención de la ficha. |
| L-06 | `ar.json`, `ur.json`, `pnb-Arab.json`: `infoMap` | La cifra ±85,0511° conserva la coma decimal española; puede interpretarse como puntuación o agrupación en esos contextos. El valor debe seguir siendo 85.0511 grados. | Escribir explícitamente ±85.0511° con punto ASCII, o formatearlo según una convención local revisada, y aislar bidireccionalmente la cifra con su signo y unidad en la composición del texto. |

Los hallazgos L-01 y L-03 a L-05 son incoherencias entre acción y texto, no solo preferencias de estilo. L-02 mejora precisión y fluidez. L-06 exige revisar tanto la cadena como su representación RTL. Se comunicaron al agente de integración; esta revisión no modifica catálogos ajenos ni da por corregidos los hallazgos.

## Comprobaciones semánticas realizadas

- `consult` abre una ficha documental: los textos revisados no prometen detonación, cálculo de daños ni resultados de ataques.
- Los títulos y descripciones nucleares conservan el contexto humanitario y el proveedor Cruz Roja; no presentan la ficha como modelo físico o predictor de bajas.
- Todos los disclaimers leídos mantienen que la cifra de población de una zona no predice heridos ni muertos, y que el portal no sustituye avisos oficiales o decisiones de emergencia.
- Los límites se conservan: longitud −180 a 180, latitud −90 a 90, detalle local hasta ±85.0511°, búsqueda de 2 a 160 caracteres. No se invirtieron las coordenadas ni se inventaron unidades.
- Las descripciones y fuentes de Beirut conservan el 4 de agosto de 2020. La fecha de edición cartográfica se obtiene de `locale-format.ts`; no está sustituida por la fecha del evento en los catálogos.
- La información distingue el mapa, donde se pueden ver calles, del buscador, que únicamente consulta países y ciudades. No se añadieron búsquedas por calle o lugares de interés en las traducciones.
- El nombre `Mapa Táctico` y los proveedores Sites, GeoNames, OpenStreetMap y WebGL2 se mantienen. Las denominaciones institucionales y los topónimos pueden tener traducciones publicadas.
- En árabe se usa una forma neutra «عدد النتائج» para los recuentos distintos de uno, evitando prometer que dos mensajes resuelven todas las categorías gramaticales árabes. Chino y japonés conservan clasificadores propios; urdu y punyabí mantienen singular y plural.

La validación estructural ejecutada confirmó 83 claves exactas, valores no vacíos, JSON válido, ausencia de U+FFFD y una única aparición de `{count}` en cada mensaje de recuento para los ocho catálogos (`es`, `en`, `zh-Hans`, `ja`, `ar`, `ur`, `pnb-Arab`, `ru`). Las coincidencias de nombres propios o años no se clasifican como traducciones faltantes. El ruso conserva la coma decimal propia de su convención y la redacción humanitaria; su recuento distinto de uno usa el título neutro «Результатов» para evitar flexiones incorrectas con las categorías few y many.

## Límites

No se ejecutaron pruebas de navegador, fuente, glifos, composición MapLibre o corte de texto. Leer JSON no acredita esos criterios. Los párrafos con signos, cifras o términos latinos en RTL requieren su comprobación visual independiente. Esta revisión no certifica los veinte idiomas, no sustituye una evaluación humana y no inicia otro bloque.
