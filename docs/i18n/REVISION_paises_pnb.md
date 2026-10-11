# Revisión de nombres geográficos en punyabí occidental

Fecha: 11 de octubre de 2026. Bloque: Sprint 2C. Revisor identificado: agente `/root/catalogos_rtl_africa`, IA Codex. Activo: `content/geography/pnb-Arab.json`. Esta revisión incluye redacción individual y una segunda lectura de las entradas y sus entidades de origen. No se atribuye a un hablante nativo, revisor humano ni autoridad toponímica.

## Procedencia y cobertura

La fuente de identidad, nombre canónico y clasificación es `content/geography/entities.json`: 258 entidades, de las cuales 239 utilizan `country-XX` y 19 utilizan identificadores `ne-...`. Este trabajo solo añade nombres; no cambia ese archivo, los identificadores, las clasificaciones, los anclajes ni las coordenadas. Una etiqueta traducida no constituye una declaración de soberanía.

Se consultó directamente [Unicode CLDR 48, pa-Arab, territories.json](https://raw.githubusercontent.com/unicode-org/cldr-json/48.0.0/cldr-json/cldr-localenames-full/main/pa-Arab/territories.json). Este archivo contiene únicamente `PK: پاکستان`. Se conserva ese nombre para Pakistán; no se presenta CLDR como una traducción completa de países en punyabí occidental ni se sustituye el catálogo por urdu.

El campo `ur` de las entidades se utilizó como ayuda para nombres propios compartidos en escritura árabe. Cada nombre se cotejó con la entidad canónica inglesa. La coincidencia de un nombre propio entre lenguas —por ejemplo Irán, China, Pakistán o Canadá— no demuestra que el texto del producto esté en urdu. En la versión revisada, 158 de las 258 etiquetas coinciden con ese campo; el resto contiene decisiones propias de transcripción o composición. No se promete que todas las transliteraciones tengan una norma editorial oficial.

Se añaden trece claves de componentes de país de las ciudades del catálogo [GeoNames, countryInfo.txt](https://download.geonames.org/export/dump/countryInfo.txt), contrastadas con la copia de ingesta `T:/tmp/atlas-gazetteer/countryInfo.txt`: BQ, BV, CC, CX, GF, GP, MQ, RE, SJ, TK, YT, CS y AN. No son trece anclajes nuevos del mapa ni se han creado nuevas coordenadas o resultados de país. El diccionario tiene 271 claves en total.

## Decisiones de nombres y correcciones de la segunda lectura

| Entidades | Decisión |
| --- | --- |
| `country-US`, `country-FM` | Composición punyabí con `دیاں` y `ریاستاں`: Estados Unidos y Estados Federados de Micronesia se distinguen sin recurrir a frases completas en urdu. |
| `country-GB` | `متحدہ بادشاہی` expresa Reino Unido; no se reduce a Inglaterra ni a la isla de Gran Bretaña. |
| `country-CG`, `country-CD` | Se usan los nombres cortos Congo—Brazzaville y Congo—Kinshasa. La segunda lectura descartó una expansión demasiado literal y redundante de «República Democrática». Los dos identificadores siguen separados. |
| `country-MF`, `country-SX` | Se conserva la distinción entre Saint-Martin y Sint Maarten con `سینٹ` y `سنٹ`. |
| `country-GY`, `country-GF`, `country-GN`, `country-GQ`, `country-GW` | Se distinguen Guyana, Guayana Francesa, Guinea, Guinea Ecuatorial y Guinea-Bisáu; Guinea Ecuatorial se escribe `استوائی گنی`, sin el desliz de identificarla como Guyana. |
| `country-DO`, `country-DM` | República Dominicana y Dominica mantienen nombres separados. |
| `country-BA`, `country-TT`, `country-AG`, `country-ST`, `country-SJ`, `country-BQ` | Las uniones de nombres propios usan el conector punyabí `تے`. |
| Islas y grupos de islas | Se distingue singular `جزیرہ` de plural `جزیرے`; no se copia indiscriminadamente el plural urdu/árabe de las entradas de apoyo. |
| `country-TF` | Se conservan tanto los territorios australes como los antárticos del nombre canónico; no se pierde la segunda parte del nombre. |
| `country-FK` | Se mantienen los dos nombres canónicos Falkland/Malvinas, sin atribuir soberanía mediante la traducción. |
| `ne-PGA` | La entidad canónica es **Spratly Islands**. El campo `ur` de apoyo decía «isla Wake», que corresponde a otra entidad. Se corrigió a `سپراٹلی جزیرے`. No se trasladó ese error al catálogo punyabí. |
| `ne-USG` | Se traduce «base naval estadounidense en Guantánamo Bay», corrigiendo la transliteración defectuosa del campo auxiliar y sin convertir la base en un país. |
| `ne-BRI` | Se traduce «isla brasileña», sin conservar el texto auxiliar truncado. |
| `ne-IOA`, `country-IO` | Se distingue el conjunto de territorios australianos del océano Índico del territorio británico. Las construcciones `دے` y `دا` son punyabíes. |
| `ne-CNM` | «Zona de amortiguación de Naciones Unidas en Chipre» conserva su entidad y su función; no se confunde con Chipre ni con el norte de Chipre. |
| `ne-CYN`, `ne-SOL` | Norte de Chipre y Somalilandia mantienen sus identificadores excepcionales; la etiqueta no los reclasifica como estados. |
| `ne-KAB`, `ne-KAS`, `ne-SPI` | Se distinguen el cosmódromo de Baikonur, el glaciar Siachen y el campo de hielo patagónico austral. La última entrada usa `دا برفانی میدان`, no una transliteración inglesa de «ice field». |
| `ne-BJN`, `ne-SER`, `ne-SCR` | Se distinguen bancos marinos y arrecife. Bajo Nuevo conserva Petrel Islands entre paréntesis; su transcripción se ajustó a `باخو` durante la segunda lectura. |
| `country-CS`, `country-AN` | Serbia y Montenegro y las Antillas Neerlandesas son componentes históricos de la fuente GeoNames. La etiqueta incluye `تاریخی` («histórico»). No se presentan como estados vigentes ni se crean anclajes para ellos. |

Los otros nombres se revisaron fila por fila como nombres propios, preservando la entidad canónica. Variaciones de transcripción no modifican el país o territorio al que se refiere el identificador.

## Validación técnica ejecutada

Se analizaron `entities.json` y el catálogo final como JSON. Resultado: 271 claves, las 258 entidades presentes, los trece componentes adicionales presentes y ninguna clave inesperada; no hay nombres vacíos, caracteres de sustitución ni caracteres gurmukhi. Todas las etiquetas contienen escritura árabe y ninguna contiene un nombre residual en letras latinas. El archivo es UTF-8 sin BOM. Se comprobó de forma específica `ne-PGA`, `country-PK`, `country-CS` y `country-AN`.

## Texto para la alternativa de nombre

Propuesta revisada para `fallbackName`, remitida al agente principal sin modificar el catálogo de interfaz:

`ایہ ناں اصل فہرست توں رکھیا گیا اے؛ ایس دا تصدیق شدہ ترجمہ نئیں ملدا۔`

Significado: este nombre se conserva del catálogo original; no hay una traducción verificada. La frase se utiliza cuando realmente se conserva un nombre original, no para ocultar una traducción ausente en este catálogo propio.

## Límites

Esta revisión lingüística por IA incluye correcciones de identidad y composición concretas, pero no certifica una norma toponímica punyabí única ni una revisión humana nativa. No declara realizadas pruebas de fuentes, composición bidireccional, etiquetas de MapLibre, coincidencia de búsqueda, identificación de países de las ciudades ni conservación de cámara. Esas pruebas de integración corresponden al agente principal del sprint. Las fuentes canónicas definen identidades; su presencia no convierte cada transcripción propia en un nombre aprobado por esas fuentes.
