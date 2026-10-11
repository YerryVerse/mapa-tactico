# Idiomas del portal · Sprint 2

11 de octubre de 2026. Se conservan los veinte idiomas y las variedades del plan v18. `lib/languages.ts` registra identificador, nombre nativo y dirección. `content/i18n` contiene los mensajes versionados; no se consultan servicios de traducción al renderizar.

## Selección y conservación

Prioridad: elección válida guardada en `mapa-tactico.language.v1`, primera preferencia compatible de `navigator.languages`, español. `es-DO`, `fr-CA`, `ur-PK` y variantes similares se emparejan por idioma. Chino sin escritura o de China continental usa `zh-Hans`; `zh-Hant`, Taiwán, Hong Kong y Macao no se sustituyen por simplificado. `pnb`, `pa-Arab` y `pa-PK` usan punyabí occidental shahmukhi; `pa-IN` no se sustituye. `ha-NG` utiliza ha-Latn. No se solicita geolocalización.

La elección actual se mantiene en React aun si leer o escribir localStorage falla. En ese caso dura durante la sesión de la página; no se promete persistencia entre recargas cuando el navegador prohíbe almacenamiento. La actualización no reconstruye el mapa, no modifica coordenadas ni firmas de fichas, y no cierra paneles. El selector nativo con búsqueda está dentro de un control desplegable accesible de cada panel, incluido Menú y las fichas.

## Secuencia y evidencia

2A extrajo las claves y conectó selección, estado y catálogos. Durante esa etapa los catálogos eran provisionales. 2B completó los veinte catálogos con 83 claves cada uno y revisión identificada por IA en `docs/i18n`; 2C entrega nombres geográficos y alias. No se solicita aceptación hasta completar los tres bloques.

Los nombres propios de proveedores, URLs, identificadores internos y datos originales conservan su identidad. La página técnica `/qa/map` es una herramienta de pruebas sin enlace de interfaz, no una sección de producto ni un catálogo traducido. Las fuentes conservan la URL del documento original aunque se traduzca su título.

## Formatos y composición

Todas las fechas publicadas se presentan en calendario gregoriano y UTC, con mes escrito para evitar ambigüedad. `supportedLocalesOf` se verifica para números, fechas y plurales en los dos navegadores de la matriz. Hausa latino utiliza los datos Intl `ha`. Cuando pnb-Arab no está disponible, el contenido conserva su catálogo de punyabí occidental; la convención numérica explícita utiliza agrupación de ur-PK y numerales arabext. Los nombres de meses se fijan en shahmukhi, sin dejar que Intl traduzca la fecha al urdu o al inglés. El conteo distingue uno y otros mediante frases completas; ninguna categoría de plural concatena fragmentos gramaticales.

La [tabla publicada de Unicode CLDR48 pa_Arab](https://www.unicode.org/cldr/charts/48/summary/pa_Arab.html) permite contrastar meses y formato día-mes-año en escritura árabe punyabí. Su identificador no se utiliza para reemplazar la variedad del contenido: la selección permanece pnb-Arab y su catálogo específico conserva revisión identificada. La métrica se convierte entre metros y kilómetros únicamente al presentar, sin alterar distancias.

Los paneles usan Noto árabe, devanagari, bengalí y telugu locales y sus licencias OFL ya fijadas en el sprint1. Las mismas fuentes están declaradas en font-faces del mapa; latín, cirílico y CJK utilizan los glifos Noto del proveedor. El canvas y atribución mantienen dirección LTR geográfica; los paneles siguen lang/dir. Coordenadas mantienen un campo LTR aislado y admiten cifras árabes, persas, devanagari, bengalí, telugu y ancho completo, menos Unicode y separadores decimales coma/punto/árabe. No se admiten separadores de miles ni notación exponencial en coordenadas.

[MapLibre documenta composición árabe y bidi incorporadas](https://maplibre.org/maplibre-gl-js/docs/API/functions/setRTLTextPlugin/); no se incorpora el plugin RTL obsoleto. La documentación no sustituye la comprobación visual de las escrituras dentro del mapa.

## Comprobación 2B · 11 octubre, 08:45 Santo Domingo

Compilación de producción local en http://127.0.0.1:5173/. TypeScript, auditoría de veinte catálogos y 34 pruebas pasan. IAB recorre los veinte idiomas: lang/dir y controles traducidos correctos. Chrome e IAB comprueban supportedLocalesOf: ha-Latn no aporta fechas/números y pnb-Arab no aporta fechas/números/plurales; las alternativas explícitas anteriores se prueban con los veinte formatos en tests. Ventanas de 320 CSS px con texto 200%: alemán, árabe, urdu, shahmukhi y telugu sin desbordamiento; también japonés en IAB. El enlace alemán del disclaimer falló primero, se corrigió overflow-wrap y se verificó de nuevo. Los valores CSS se midieron después de aplicar el zoom del navegador, sin confundir 400 píxeles de emulación con 320 CSS px en Chrome al 125%.

Chrome e IAB renderizan las veinte muestras dentro de MapLibre (`scriptCount:20`), sin errores ni cuadros de caracteres ausentes; se revisan ligaduras árabes y grupos índicos. Escape cierra el panel. Una respuesta de búsqueda demorada que ignora AbortSignal se descarta después de cambiar de es a en: cero resultados obsoletos y botón Search activo. El test de caché verifica claves distintas por es/ar/pnb-Arab. Las modificaciones temporales de fetch, tamaño de texto y viewport se retiraron. La capa de países continúa pendiente de 2C; esta evidencia no la acredita ni acredita todavía la versión pública.

## Comprobación final local · 11 octubre, 09:12 Santo Domingo

2C añade la clave countryOriginal, revisada en los veinte idiomas: la edición final contiene 84 claves por catálogo. La auditoría comprueba las veinte traducciones, variables y Unicode, los 271 nombres por idioma y sus hashes. TypeScript, compilación de producción y 39 pruebas en siete archivos pasan. Las revisiones identificadas incluyen los defectos corregidos y la procedencia de los nombres; no son certificaciones humanas.

IAB cambia los veinte idiomas con Alemania seleccionada: conserva exactamente punto 9.678348/50.961733, centro y zoom 3; cambia countryField y el nombre renderizado country-DE. Chrome recorre también los veinte countryField y sus etiquetas renderizadas con centro -30/20 y zoom 1.25 constantes. Chrome necesita una pestaña activa para comprobar render/idle: el muestreo inicial en segundo plano se descartó por no representar la pintura actual, y el recorrido completo se repitió con Page.bringToFront. No se contabiliza ese muestreo inicial como verificación válida.

La búsqueda HTTP local acepta los veinte nombres de Alemania con respuesta 200 e idéntico identificador y coordenadas. En la interfaz, Alemania en árabe se relocaliza a shahmukhi sin nueva búsqueda; elegir el resultado mantiene country-DE. Las fichas de Beirut y el disclaimer cambian en los veinte idiomas, conservando firma context-20261011-2 y enlaces originales. Los tamaños y fuentes se comprobaron en Chrome e IAB; las muestras técnicas de las veinte escrituras se renderizan dentro de MapLibre.

La excepción Spratly se comprueba sobre la etiqueta real del mapa en maratí: el panel de ubicación presenta Spratly Islands y explica que procede de la lista original y carece de traducción verificada. Al usar promoteId y properties.id, la etiqueta conserva ne-PGA; se corrigió el identificador secuencial que MapLibre asignaba sin promoteId. Los cambios de idioma no alteran clasificaciones ni anclajes; el número de etiquetas visibles puede variar por las colisiones entre textos de distinto ancho.

Esta sección acredita la compilación local. La URL, versión y comprobación pública se registrarán por separado en la guía y en el seguimiento antes de solicitar aprobación.

### Corrección de la comprobación pública · 09:16 Santo Domingo

La rama 503 de app/api/search/route.ts cuando faltan DB/ASSETS conservaba texto español. Se localizó con el mismo catálogo y política de idioma, sin cambiar códigos HTTP, bindings ni acceso. Una prueba nueva ejecuta los veinte idiomas con servicios ausentes y comprueba mensaje, 503 y no-store. TypeScript, auditoría, compilación y 40 pruebas pasan. La versión 20 publicó correctamente las funciones, pero se sustituye por una versión posterior que incluye esta corrección; no se solicita aprobación de la 20.
