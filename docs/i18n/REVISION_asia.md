# Revisión de los seis catálogos de escrituras asiáticas

Fecha: 11 de octubre de 2026, America/Santo_Domingo. Alcance: Sprint 2B, las 83 claves del catálogo español del producto existente. Archivos: `content/i18n/zh-Hans.json`, `ja.json`, `hi.json`, `bn.json`, `mr.json` y `te.json`.

Responsable identificado: agente IA Codex `/root/catalogos_asia`. La primera pasada produjo las traducciones completas. La segunda pasada comparó todas las claves con el español, comprobó el sentido de las instrucciones y volvió a leer errores, fuentes y disclaimer. Esta es una revisión lingüística efectuada por IA; no se atribuye a un revisor humano ni se declara certificación de hablante nativo.

## Revisión efectuada

| Idioma | Comprobaciones lingüísticas de la segunda pasada | Resultado |
| --- | --- | --- |
| zh-Hans | Escritura simplificada; imperativos de botones; diferencia entre posición, coordenadas y registro histórico; nombres de Beirut y Líbano; consulta de información frente a búsqueda geográfica. | 83 textos revisados. `query` corregido a `资料查询` después de revisar el contexto de ejecución. Las dos formas del contador conservan `{count}` y el clasificador `个`. |
| ja | Terminología de documentos y mapa; instrucciones de teclado; construcción de frases completas; contador con `件`; distinción entre detalles de mapas y exactitud de los datos. | 83 textos revisados. Se corrigió `query` de `検索条件` a `資料の取得`: el componente lo usa al obtener una ficha, no al introducir condiciones de búsqueda. |
| hi | Concordancia e imperativos; distinción entre देशांतर y अक्षांश; instrucciones de recuperación; separación entre datos históricos, población y predicciones; conservación de marca y proveedores. | 83 textos revisados. `query` expresa obtención de información. `countOne` y `countOther` son frases completas con `{count}`; la forma de परिणाम no cambia en este contexto. |
| bn | Escritura bengalí; terminología de coordenadas; posición del contador `টি`; frase completa del disclaimer; acciones de recuperación y límites de búsqueda. | 83 textos revisados. Se corrigió el título del disclaimer a `দায়বর্জন ঘোষণা`, evitando un término que expresaba reconocimiento de responsabilidad. Se conservó la instrucción de intentar otro nombre en `noPlaces`. `query` expresa consulta de información. |
| mr | Escritura devanagari maratí; distinción entre रेखांश y अक्षांश; concordancia de las situaciones; imperativos; explicación del contador global y datos técnicos. | 83 textos revisados. `query` describe la obtención de información. Las formas de `निकाल` son válidas con el contador en esta construcción. |
| te | Escritura telugu; orden de las instrucciones y fechas; coordenadas; singular/plural de resultados; diferencia entre una situación y una escena visual. | 83 textos revisados. Se cambió `దృశ్యం` por `పరిస్థితి` para escenario y sus textos relacionados, para evitar interpretar el selector como escenas visuales. `query` expresa obtención de información. Contador: `ఫలితం` / `ఫలితాలు`. |

La revisión contextual adicional de `query` partió de una observación independiente del agente coordinador. Se comprobó directamente `components/map/Portal.tsx`: esta clave titula el estado `execution`. La corrección se aplicó a los seis idiomas y después se repitió la auditoría estructural.

En los seis idiomas se verificó que las instrucciones permiten explorar calles en el mapa, mientras el buscador solo menciona países y ciudades. Las traducciones mantienen las acciones de reintentar, cambiar escenario y elegir ubicación. El disclaimer conserva que la población no predice heridos ni fallecidos, que los contenidos militares son históricos y humanitarios y que no se calculan ataques sobre lugares reales. No se introdujeron predicciones ni propiedades nuevas en las traducciones.

Los nombres de las instituciones ONU y CICR se expresan en cada idioma. Se conservan literalmente `Mapa Táctico`, `GeoNames`, `OpenStreetMap`, `Sites` y `WebGL2`. Las fechas mantienen el 4 de agosto de 2020. Los intervalos de coordenadas y ±85.0511° mantienen sus valores y signos. La representación dinámica de números depende del formateador local del producto; estos archivos no cambian unidades ni añaden interpolaciones.

## Auditoría estructural ejecutada

Se ejecutó una comprobación Node sobre los seis JSON, leyendo `es.json` como conjunto canónico de claves. Resultado: 83 claves exactas por idioma, ninguna clave ausente o adicional, ningún valor vacío, ningún carácter de reemplazo U+FFFD, ningún control ASCII no permitido, ninguna cadena idéntica a la versión española y ningún marcador `{count}` perdido o añadido. Los nueve invariantes de marca, proveedores, tecnología, fecha y límites numéricos se conservaron. No se utilizaron placeholders de traducción.

| Archivo | Claves | SHA-256 al terminar esta revisión |
| --- | ---: | --- |
| zh-Hans.json | 83 | `988207b5209a27f20d7dffceddbcbd1ea8ff0d457760ba177e5b306bc316a4ee` |
| ja.json | 83 | `6d064798cc9246021faabc37362813ee908a68909510b5f753848d791e0ab9ff` |
| hi.json | 83 | `271a43dbb3027da79e6c9687f1d286dc5e8bc0b74f88da103d9b85b352ae22e6` |
| bn.json | 83 | `3655f7dba74d21303c1364349c875c0fc0141e80ca69fefa88ac73b533ee7759` |
| mr.json | 83 | `b190f4a5b9632985af00a27c6875e5c0523882903171131d1ea524048cfbebfd` |
| te.json | 83 | `ec338f32eedd3b4ca69fb763239a02c2973e5ddda9b3c86840e92f1109f57804` |

## Límites de esta entrega acotada

La corrección estructural no demuestra composición tipográfica ni legibilidad visual. Esta tarea no ejecutó pruebas de navegador, zoom de texto, glifos de MapLibre ni etiquetas cartográficas. Esas verificaciones pertenecen a la integración y aceptación del Sprint 2. Las traducciones aquí revisadas no equivalen a revisión humana nativa y pueden beneficiarse posteriormente de ella. No se modificaron plan, seguimiento, publicación ni código compartido.
