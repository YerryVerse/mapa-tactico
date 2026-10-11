# Revisión de países en diez idiomas

Fecha: 11 de octubre de 2026. Sprint 2C. Revisora identificada: agente IA Codex `/root/catalogos_latin`. Idiomas: español, inglés, francés, portugués, alemán, indonesio, vietnamita, turco, suajili y hausa latino. Revisión de activos y asociaciones, sin atribución de certificación humana, lingüística nativa ni autoridad toponímica.

## Fuentes, identidad y validación

Se revisó la versión inicial `countries-cldr48-ne20261011-20dc3231b201` de `content/geography/names.json`, junto a `manifest.json` y `entities.json`. Se contrastaron los diez diccionarios contra los archivos descargados de Unicode CLDR 48.0.0 en `T:/tmp/mapa-tactico-idiomas/`: `es`, `en`, `fr`, `pt`, `de`, `id`, `vi`, `tr`, `sw` y `ha`. El identificador ha-Latn utiliza explícitamente el archivo CLDR ha; no se intercambia con otra escritura.

La validación ejecutada confirmó hashes SHA-256 de las diez fuentes CLDR iguales a los del manifiesto. Los hashes del diccionario y las entidades también coincidieron con el manifiesto. Se verificó el archivo Natural Earth `T:/tmp/atlas-gazetteer/country-labels.geojson`: hash `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`, correspondiente al commit fijado `ca96624a56bd078437bca8184e78163e5039ad19`.

Cada idioma contiene 271 nombres: 239 entidades con código ordinario, 19 entidades Natural Earth con identificador `ne-...` y 13 componentes adicionales de nombres de ciudades. De las 252 claves `country-XX`, 250 tienen nombre disponible en CLDR y coinciden exactamente con su código de origen; CS y AN carecen de entrada vigente y se conservan como nombres históricos de la fuente. No se encontraron duplicados exactos al normalizar caja y Unicode NFC en ninguno de los diez idiomas. No se interpretan estos 239 códigos como 239 estados soberanos: incluyen territorios con su clasificación original.

Licencias registradas: CLDR, Unicode-3.0; Natural Earth, dominio público. La elaboración y revisión propias pertenecen al proyecto. La revisión no modifica licencias ni convierte nombres propios de elaboración del proyecto en nombres oficialmente aprobados por Unicode o Natural Earth.

## Asociaciones especialmente revisadas

| Entidades | Resultado |
| --- | --- |
| CG y CD | Permanecen separados. CLDR utiliza Congo/Brazzaville y Congo/Kinshasa, o República Democrática del Congo según idioma. Español «Congo» y hausa «Kongo» para CG no producen duplicado con CD. |
| KP y KR | Norte y sur no están intercambiados. Vietnamita conserva los nombres diferenciados «Triều Tiên» y «Hàn Quốc». |
| `ne-PGA` | La entidad canónica es Spratly Islands. Los campos NAME_ES, NAME_EN y los demás NAME_* revisados de Natural Earth dicen Wake/Isla Wake, que corresponde a otra entidad. El generador descarta esos campos y conserva «Spratly Islands», con alternativa declarada en los idiomas distintos del inglés. No se trasladó el error de Wake. |
| MF y SX | Saint-Martin y Sint Maarten permanecen diferenciados, con nombres de CLDR por código. |
| GY, GF, GN, GQ y GW | Guyana, Guayana Francesa y las tres Guinea no se confunden ni se unen por coincidencia parcial del nombre. |
| DO y DM | República Dominicana y Dominica permanecen separadas. |
| `ne-IOA` y IO | Los territorios australianos y el territorio británico del océano Índico conservan identificadores distintos. |
| `ne-CYN`, CY y `ne-CNM` | Norte de Chipre, Chipre y zona de amortiguación de Naciones Unidas no comparten identificador; la traducción no cambia su clasificación. |
| `ne-BJN`, `ne-SER`, `ne-SCR` | Bajo Nuevo, Serranilla y Scarborough conservan sus asociaciones distintas; no se encontraron duplicados entre ellas. Algunas fuentes usan isla, banco o bajío en su denominación publicada: el nombre no debe usarse para cambiar la geometría o clasificación de la entidad. |

## Alternativas declaradas y hallazgos específicos

La versión revisada declara tres alternativas en es, fr, pt, de, id, vi y tr: `ne-PGA`, `country-CS` y `country-AN`. Inglés no precisa traducción alternativa para estos nombres ingleses. Suajili y hausa declaran las 19 entidades NE y los dos componentes históricos: 21 alternativas por idioma. Estos casos no se sustituyen por traducciones inventadas. Las 13 claves adicionales no crean nuevos anclajes de país; CS y AN no se presentan como países vigentes.

Se identificaron límites en las traducciones publicadas NAME_* que el manifiesto inicial trataba como traducciones disponibles. Después se verificaron las correcciones P-01 a P-03 en la edición `countries-cldr48-ne20261011-957b5c556a06` y las trece correcciones completas en la edición final `countries-cldr48-ne20261011-554aaaf21aba`. La tabla conserva los valores iniciales y el motivo de la corrección; todos los casos están resueltos mediante nombre canónico y alternativa declarada:

| ID | Etiqueta inicial | Problema y corrección aplicada |
| --- | --- | --- |
| P-01 | tr, `ne-USG`: «Guantanamo Bay» | Nombraba la bahía y omitía que la entidad es una base naval. Corregido y verificado: «US Naval Base Guantanamo Bay», con alternativa declarada. La entidad y su anclaje se conservan. |
| P-02 | de, `ne-USG`: «Guantanamo Bay Naval Base» | Era una frase inglesa dentro de NAME_DE, no una traducción alemana. Corregido y verificado: nombre canónico «US Naval Base Guantanamo Bay», con alternativa declarada. |
| P-03 | tr, `ne-IOA`: «Australian Indian Ocean Territories» | NAME_TR contenía una frase inglesa. Corregido y verificado: nombre canónico «Indian Ocean Territories», con alternativa declarada; el identificador de la entidad y su componente padre AU se conservan. |
| P-04 | id, `ne-CNM`: «United Nations Buffer Zone di Cyprus» | Mezclaba una descripción inglesa con una preposición indonesia y el topónimo inglés. Corregido: «Cyprus U.N. Buffer Zone», alternativa canónica declarada. |
| P-05 | tr, `ne-SPI`: «Campo de Hielo Sur» | Era el nombre español publicado en NAME_TR, no una traducción turca. Corregido: «Southern Patagonian Ice Field», alternativa canónica declarada. |
| P-06 | id, `ne-ESB`: «Dhekelia Cantonment» | Cantonment era un descriptor inglés, no indonesio. Corregido: «Dhekelia», alternativa canónica declarada. |
| P-07 | id, `ne-BRI`: «Brazilian Island» | La descripción estaba en inglés sin explicación. Se conserva el nombre canónico «Brazilian Island» y se declara la alternativa. |
| P-08 | id, `ne-KAS`: «Siachen Glacier» | Glacier era un descriptor inglés. Se conserva el nombre canónico «Siachen Glacier» y se declara la alternativa. |
| P-09 | vi, `ne-BJN`: «Bajo Nuevo Bank» | Bank permanecía como descriptor inglés. Corregido: «Bajo Nuevo Bank (Petrel Islands)», alternativa canónica declarada. |
| P-10 | vi, `ne-SER`: «Serranilla Bank» | Bank permanecía en inglés. Se conserva el nombre canónico «Serranilla Bank» y se declara la alternativa. |
| P-11 | tr, `ne-BJN`: «Bajo Nuevo Bank» | Descriptor Bank en inglés. Corregido: «Bajo Nuevo Bank (Petrel Islands)», alternativa canónica declarada. |
| P-12 | tr, `ne-SER`: «Serranilla Bank» | Descriptor Bank en inglés. Se conserva el nombre canónico «Serranilla Bank» y se declara la alternativa. |
| P-13 | tr, `ne-SCR`: «Scarborough Shoal» | Descriptor Shoal en inglés. Corregido: «Scarborough Reef», alternativa canónica declarada. |

Estos trece hallazgos no afectan los 239 nombres ordinarios CLDR. Son excepciones de metadatos lingüísticos o de precisión descriptiva en entidades especiales; se remitieron al agente principal y están corregidos y verificados en `554aaaf21aba`. Se ejecutó una comprobación independiente de cada par idioma/entidad: el valor coincide con `entities.json` y su identificador figura en `manifest.fallbacks`. Se comprobó el SHA-256 completo registrado en el manifiesto contra los bytes reales de `names.json`.

La segunda lectura cubrió las 19 entidades excepcionales en los diez idiomas. No se hallaron otras asociaciones equivocadas; las formas locales propias «Ilha Brasileira», «Isla Brasilera», «Baikonur» o «Bir Tawil» no se rechazan solamente por coincidir con otra lengua. La auditoría final vuelve a confirmar los diez hashes CLDR, las 250 coincidencias por código disponibles por idioma y ausencia de duplicados. Las alternativas finales son: es 3, en 0, fr 3, pt 3, de 4, id 7, vi 5, tr 9, sw 21 y ha-Latn 21. Este documento no modifica ningún catálogo.

## Revisión de `countryOriginal`

Se revisaron las diez frases añadidas como clave 84 al catálogo de interfaz. Todas expresan que se conserva el nombre del catálogo original y que no hay una traducción verificada. Francés, portugués, alemán, indonesio, vietnamita y turco conservan el significado; suajili «Jina hili limehifadhiwa kutoka kwenye orodha ya awali; hakuna tafsiri iliyothibitishwa» y hausa «An riƙe wannan suna daga kundin asali; babu fassarar da aka tabbatar» también corresponden a ese estado. No prometen precisión geográfica ni alteran la clasificación del territorio. No contienen placeholders que el código deba interpolar.

La frase solo debe mostrarse para alternativas reales del manifiesto, en la ficha de ubicación pertinente, sin aviso global. No se recomienda mostrarla para todo topónimo coincidente entre idiomas —por ejemplo Indonesia, Bir Tawil o Somaliland—, pues la coincidencia de un nombre propio no demuestra ausencia de traducción.

## Límites de la entrega

Se revisaron asociaciones por código, equivalencia con fuentes fijadas, duplicados y coherencia de las excepciones y su frase explicativa. Los trece hallazgos identificados están resueltos y se verificaron los activos finales. No se ejecutaron pruebas de navegador, composición de etiquetas en MapLibre, búsqueda en veinte idiomas, conservación de cámara o aislamiento bidireccional. La revisión no certifica todos los nombres de entidades especiales ni una norma toponímica única, y no convierte las alternativas declaradas en traducciones locales existentes.
