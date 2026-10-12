# Reverificación del Sprint 2 · Plan 21

Revisión vigente tras el mensaje «Apruebo la revisión del Sprint 1 y continuar el Sprint 2». Se verifican los bloques2A→2B→2C en orden, con estados registrados mediante seguimiento-sprints.mjs. Producto: Sites24, SHA `2b859c535a70e94e4b467348a75b7f1594a1f514`; código funcional sin cambios respecto a esa publicación. Entorno: navegador integrado Chromium155; no pruebas nuevas en Chrome.

- **2A:** veinte nombres nativos y filtro العربية; cambio es→pt conserva Santiago y zoom12; pt persiste tras recargar pese a navegador en-US. Storage.setItem bloqueado temporalmente permite cambiar a ar conservando ficha/firma y cámara; el método se restaura. Catálogos locales completos, prioridad y fallos de almacenamiento cubiertos en pruebas. Selector público con Tab/Enter cambia a English; después se restituye español.
- **2B:** ficha Beirut recorrida en20idiomas con firma intacta. RTL ar/ur/pnb-Arab a320×740 con texto200%, sin desbordamiento horizontal y campos LTR. Vista amplia1283×764; tamaños temporales restituidos. Información hausa muestra11 Oktoba,2026. MapLibre renderiza20 muestras reales con glifos inspeccionados y captura. Auditor válido salida0; copia temporal sin language en en.json salida1; origen intacto.41 pruebas y TypeScript pasan.
- **2C:** país Alemania en20idiomas mantiene country-DE, referencia9.678348/50.961733, cámara y zoom3; etiquetas propias, sugerencias y Ubicación localizadas. Veinte Disclaimer distintos. Spratly Islands con maratí y Ubicación abierta muestra ne-PGA y explicación localizada del nombre original. Calles mantienen name/name:latin; pruebas verifican4780pares y validación positiva country/city en proveedor, servidor y caché.
- **Publicación:** Sites confirma audiencia pública y versión24. API anónima20 consultas de Alemania devuelve200, la misma entidad/coordenadas y tipos permitidos. Recorrido cartográfico20idiomas en la publicación espera document.lang y campo name_<idioma>, evitando lecturas antes de actualizar la capa. Ficha japonesa y RTL320/texto200% comprobados también en Sites24. Cero marcadores automáticos en el recorrido geográfico.

Registros actuales: docs/seguimiento/evidencia-sprint02-plan21.json y evidencia-api-sprint02-sites24.json. Capturas nuevas: sprint-02-plan21-escrituras.png, sprint-02-plan21-rtl.png, sprint-02-plan21-original.png y sprint-02-sites24-rtl-revision.png. Se conservan exactamente las pestañas1 (informe) y5 (portal). La supervisión local usa4174/5173; se mantiene activa. Sprint3 permanece pendiente hasta aprobación humana del Sprint2.

## Historial anterior retirado · Plan 19

**Historial retirado por plan20:** el cambio de marcadores del11/10/2026 reabre Sprint1 y retira la revisión posterior. Las comprobaciones de Sites23 se conservan como historial; los criterios de Sprint2 requieren nueva comprobación tras aprobar Sprint1.

11 de octubre de 2026. El usuario aprobó explícitamente en esta conversación: «Apruebo el Sprint 1 y continuar el Sprint 2». La aprobación corresponde a Sites22, fuente `a8d62202c3453d086d43079ee8f66f866835e69a`. Se conserva el proyecto `appgprj_6aca23222ed881919537ddd318f39d79`, con audiencia pública comprobada mediante Sites.

Portal actual: https://atlas-escenarios-hud.yerrybatista.chatgpt.site/. Compilación de producción de la misma fuente: http://127.0.0.1:5173/. Seguimiento en vivo: http://127.0.0.1:4174/sprint-02.html.

## Bloque 2A

- TypeScript, compilación de producción, auditoría y 40 pruebas de ocho archivos pasan. La auditoría comprueba 20 catálogos de 84 claves, 271 nombres por idioma y 258 entidades.
- Navegador integrado, UA Chrome/155.0.0.0, ventana 1280×720 CSS. Selector público: 20 opciones nativas, sin banderas. El filtro `arab` deja solamente العربية. Elegirla cambia controles, dirección y nombre del país sin cerrar Ubicación ni modificar −70.690850/19.450360.
- Compilación local: se fija −69.8845/18.4737, zoom15, y se abre Beirut. Con lectura y escritura de Storage bloqueadas mediante una inyección temporal, elegir urdu conserva ficha, firma `{"id":"beirut-2020-context","version":"context-20261011-2"}`, punto y cámara. El documento adopta `ur` y `rtl`. Los métodos originales se restauran.
- Elegir portugués y recargar conserva `pt` pese a la preferencia `en-US` del navegador. Sin elección guardada, la recarga selecciona `en`. Los tests comprueban español para preferencias incompatibles, prioridad manual y variantes es/zh/pa/ha, además de almacenamiento malformado o bloqueado. No se solicita geolocalización.
- Los catálogos se importan localmente; el selector actualiza React sin llamadas a un traductor. Cambiar idioma mantiene abierta la ficha. La persistencia del punto entre recargas no es un requisito: la conservación comprobada corresponde al cambio de idioma dentro de la sesión.

## Bloque 2B

- Se detectó en IAB155 que `ha` no tiene datos Intl para números y fechas. El criterio quedó rojo, se corrigieron 2B-02/07 y se verificó de nuevo. La alternativa usa datos CLDR48 de hausa; la revisión y las fuentes exactas están en docs/i18n/REVISION_formatos_hausa.md. TypeScript, build y 41 pruebas pasan. El error de tipos del primer borrador de la prueba también quedó corregido antes de declarar el éxito.
- IAB155 y Chrome154 recorren Información en los veinte idiomas; todos muestran fecha localizada. Hausa: `11 Oktoba, 2026`; shahmukhi: `۱۱ اکتوبر ۲۰۲۶`. El recorrido de fichas verifica veinte descripciones distintas y las mismas fuentes/firma.
- IAB155 y Chrome154: alemán, árabe, urdu, shahmukhi, telugu y japonés a 320×720 CSS, sin overflow horizontal del panel, controles o nombres del selector. Texto al 200% mediante CSS temporal: 16→32px y duplicación de títulos/tamaños fijos. Los campos numéricos permanecen LTR. Chrome usa emulación400×900 por su zoom125%; se mide el viewport CSS, no la emulación. Una lectura inicial de Chrome antes de aplicar el cambio de idioma se descartó; se repitió esperando el atributo html lang correcto en cada paso.
- Las modificaciones de CSS y tamaño de ventana se retiraron. En árabe, Tab y Enter aceptan `−٦٩٫٨٨٤٥` / `١٨٫٤٧٣٧` como punto −69.8845/18.4737. El desplazamiento vertical permite alcanzar todos los controles con texto ampliado.
- MapLibre pinta las veinte muestras en IAB1280×720 y Chrome1536×722; `scriptCount:20` y teselas cargadas. Revisión visual de latín, árabe/shahmukhi/urdu, CJK e índicas, sin cuadros ausentes. El mapa conserva su orientación. Son muestras técnicas, fuera de la interfaz pública.
- La auditoría real rechaza con salida1 un catálogo en.json sin clave close en una carpeta temporal aislada; la fuente del portal permanece intacta. npm build ejecuta esa auditoría antes de compilar. Las revisiones lingüísticas IA identificadas en docs/i18n se conservan como tales, sin atribuir revisión humana.

## Bloque 2C

- Worker compilado, API anónima: veinte nombres de Alemania devuelven HTTP200, country-DE y el mismo anclaje9.678348/50.961733. La búsqueda se resuelve sobre el catálogo local incluso en pnb-Arab. Las pruebas comprueban los4780pares país/idioma, alias, normalización del proveedor, filtrado de tipos en servidor y caché, y conservación de los nombres publicados de ciudades.
- Recorrido completo IAB155: veinte campos de etiquetas y nombres renderizados en el mapa, sugerencias y ficha coinciden. Se conserva country-DE, el punto, centro y zoom3; la búsqueda queda abierta y mantiene la consulta. Registro: docs/seguimiento/evidencia-paises-20.json. Un primer recorrido parcial detenido por el timeout de la herramienta se descartó y se repitieron los veinte idiomas con la pestaña visible.
- Veinte Disclaimer distintos, cada uno con cinco párrafos, y veinte nombres de la ficha de ubicación. Se conserva la misma entidad, punto y cámara. Catálogos, activos CLDR48/Natural Earth, clasificación239+19entidades y revisión lingüística IA identificada permanecen sin cambios. Una única capa propia de países sustituye las etiquetas del proveedor; el estilo de calles conserva name/name:latin publicados.
- Excepción Spratly comprobada de nuevo: con maratí, zoom5 y etiqueta visible se pulsa Spratly Islands. Selección ne-PGA, anclaje115.815273/10.712413; Ubicación muestra el nombre original y la explicación traducida de ausencia de traducción verificada. Captura: docs/seguimiento/sprint-02-pais-original.png.
- La revisión de veinte escrituras, textos ampliados y ausencia de Intl indicada en2B también cubre los criterios de composición de2C. Los cambios de formato no alteran la geometría ni sustituyen el idioma del contenido.

## Entrega

Sites23 publicada correctamente el11/10/2026 a las 10:48:17 de Santo Domingo. Fuente `8f825f6d19459f0a30c26b50f69eaa3228805772`, versión `appgprj_6aca23222ed881919537ddd318f39d79~appgver_e30a44fce8e48191b558ca5e817fb14c`, despliegue `appgdep_6acba1a739008191b5d196d160260d31`. Mismo proyecto y audiencia pública.

API anónima publicada:20/20 nombres de Alemania, HTTP200, ID y anclaje idénticos; docs/seguimiento/evidencia-api-sites23.json. Recorrido del mapa público:20/20 idiomas, sugerencia y etiqueta coinciden, country-DE, punto, un único centro y zoom3 constantes; consulta árabe y lista abiertas. Registro docs/seguimiento/evidencia-mapa-sites23.json. Cerrar con X conserva el punto. Información Hausa muestra11 Oktoba, 2026 sin error; captura sprint-02-sites23-hausa.png. La captura sprint-02-sites23.png muestra el buscador en español con la consulta árabe conservada.

Preparación: el source helper sincronizó el commit exacto. Su build wrapper y packager fallaron por resolución de npm/rutas Windows y por falta de Node en WSL; no se atribuye éxito a esos intentos. Se reutilizó el build anterior exitoso con los mismos archivos de aplicación, validado mediante Worker local. Para empaquetar se ejecutó el validador oficial prepare-site-build.cjs con Node Windows y tar.exe sobre un staging local nuevo, con manifiesto, atribución y migraciones; el helper de apertura confirmó después el SHA remoto exacto. Sites aceptó el archivo y publicó correctamente.

Los 36 puntos están terminados y verificados. El Sprint 2 queda abierto para aprobación explícita del usuario; Sprint 3 permanece pendiente.
