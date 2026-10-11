# Cartografía del bloque1A

Bloque 1A verificado el 11 de octubre de 2026 UTC. El sprint continúa abierto; estos resultados no conceden aprobación humana.

- Motor: MapLibreGLJS6.13.0, BSD3clause. Versiones directas fijadas, package-lock.json reproducible. React19.2.6, Vinext1.0.0-beta.5, Vite8.0.13, starter oficial de Sites. WebGL2 obligatorio.
- Cartografía: OpenFreeMap, esquema OpenMapTiles, datos de OpenStreetMap bajo ODbL. Uso comercial de instancia pública sin clave, registro ni límite de solicitudes publicado; sin SLA. Fuentes: https://openfreemap.org/ y https://github.com/hyperknot/openfreemap/blob/main/LICENSE.md. Acceso10oct2026.
- Edición de teselas fijada:20261004_113936_pt. Se obtuvo del TileJSON del servicio el11oct2026UTC; el endpoint latest se usa solo para investigación, nunca para renderizar la aplicación. Zoom nativo0–14; zoom del cliente hasta22. El sobreacercamiento conserva geometría existente y NO incorpora datos de mayor resolución. La actualización del proveedor será una decisión versionada; no se descargan teselas masivamente.
- Cobertura OSM mundial, variable por región. No garantiza nombres ni completitud de calles, especialmente océanos/rural/polos. La proyección permite globo global; detalle local se limita a latitudes con cobertura Mercator (±85.05112878°). Al solicitar detalle fuera de ellas se debe conservar vista global e informar el límite.
- Estilo ATLAS propio definido en lib/map-style.ts. Lista explícita de capas, sin POI, aeropuertos, monumentos, edificios ni iconos. Países y ciudades españoles con nombre original como alternativa; veinte traducciones pertenecen al sprint2. Sin satélite ni fotografías.
- Atribución visible:OpenFreeMap,©OpenMapTiles,©OpenStreetMap, con enlaces. No existen claves cartográficas privadas/públicas ni secretos en el código.
- Glifos NotoSansRegularPBF del proveedor para latín,cirílico,CJK. Font-faces locales para árabe/urdu/shahmukhi,devanagari,bengalí,telugu; archivo OFL en public/fonts. Noto fijado al commit578d18e1cfce41c8cc93d0a0f514cac3a1affb2e. Los cuatro TTF suman869104bytes y se cargan por demanda. PBF con HTTP200 no garantizaba telugu; se revisaron caracteres y se añadieron fuentes explícitas. La prueba de composición requiere muestras dentro del mapa, no solo CSS.
- Worker oficial copiado desde el paquete fijado por scripts/preparar-worker.mjs y servido en el mismo origen mediante setWorkerUrl. El dev-server transforma el import de Vite worker&url con código HMR de ventana, incompatible con WorkerGlobalScope. El activo estático evita esa transformación y se integra en dist/client; no requiere CDN ni blobworker. MIME y CSP deben verificarse en Sites.
- Scripts de prebuild/predev regeneran únicamente ese activo necesario. Los HTML de seguimiento no se publican con el portal. Página técnica /qa/map sin enlace en la interfaz ni indexación, para evidencia de escala/escrituras.
- Equipo de referencia registrado ANTES de medir:Windows,Ryzen9 7900X,RTX3060,IAB Chromium. Red real actual sin throttling, versión y mediciones por registrar. Objetivos:≤5s mapa con caché fría,≤200ms controles,≥30fps interacción. No se ha aprobado reducirlos.
- El shim npm de Windows invocado por los helpers de Sites resolvió erróneamente npm-cli.js dentro del checkout. La instalación se ejecutó con el entrypoint oficial C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js run install:ci después del fallo; se conserva install-ci del starter y lockfile. La compilación directa ejecuta el mismo scripts/run-framework.mjs build. No se alteraron npm global,HOME,proxy,registro ni cachés de host.

La audiencia Sites actual es custom, exclusivamente el propietario, sin grupos ni visitantes. Se mantiene la identidad appgprj_6aca23222ed881919537ddd318f39d79; no hay servicios dependientes del PC en el código publicado.

## Evidencia de la versión publicada

URL: https://atlas-escenarios-hud.yerrybatista.chatgpt.site/qa/map. Commit 0f2d03f08ed2f18bd9c4e64390ed7c7a0a4e32bb; versión appgprj_6aca23222ed881919537ddd318f39d79~appgver_f579ac345a808191b46d66fd818aa6f1. Publicación satisfactoria 2026-10-11T02:15:08Z.

Chromium 155.0.0.0, Windows, Ryzen 9 7900X y RTX 3060; viewport 1280 × 720 CSS, red real sin emulación. Caché desactivada mediante CDP. Carga 2558,9 ms; animación de 3002,9 ms produjo 432 fotogramas (143,86 fps), primera respuesta 5,6 ms. Cumple los presupuestos fijados antes de medir.

| Lugar | Centro | Zoom | 5 metros en píxeles CSS |
| --- | --- | --- | --- |
| Santo Domingo | -69.8845, 18.4737 | 19 | 35,311 |
| Quito | -78.513, -0.2202 | 19 | 33,492 |
| Madrid | -3.7038, 40.4168 | 19 | 43,990 |

Pitch cero. El motor declara proyección globe y realiza su transición automática al detalle local. Las tres pruebas zoom 19 → 1,25 → 19 conservan centro (tolerancia de redondeo 10⁻¹² grados) y coordenadas de referencia exactas, leídas con la API pública GeoJSONSource.getData(). Se reparó renderWorldCopies para evitar un recentrado involuntario. Los datos de referencia originales se comprueban después de idle; la geometría cuantizada de teselas no se usa para afirmar exactitud.

Tokio, Nairobi, Sídney, área rural dominicana e Islandia cargaron sus teselas. Cruce 179,99 → 180,01 se normaliza a -179,99 sin romper la vista. Solicitar 89° conserva una vista global válida: el motor limita el centro según la escala y la herramienta de comprobación explica que no existe detalle Mercator más allá de ±85,0511°.

En el dominio Sites: HTML y /api/health HTTP 200 con CSP; worker oficial HTTP 200 text/javascript; CSS y JS del build HTTP 200. Glifos remotos HTTP 200 con CORS *, cuatro fuentes locales y veinte muestras revisadas dentro del mapa. No se usan sprites, pues no hay iconos cartográficos. No se observaron errores nuevos de inicialización, CSP ni origen en esta versión. Cinco pruebas automatizadas de estilo, capas, fuentes, versión y copia exacta del worker pasaron; TypeScript y build oficial pasaron.
