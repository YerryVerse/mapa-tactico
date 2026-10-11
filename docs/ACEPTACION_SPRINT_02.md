# Revisión vigente del Sprint 2 · Plan 19

Entrega **Sites23**, publicada el11/10/2026 a las 10:48:17 de Santo Domingo: https://atlas-escenarios-hud.yerrybatista.chatgpt.site/. Fuente `8f825f6d19459f0a30c26b50f69eaa3228805772`. Versión `appgprj_6aca23222ed881919537ddd318f39d79~appgver_e30a44fce8e48191b558ca5e817fb14c`; despliegue `appgdep_6acba1a739008191b5d196d160260d31`. Se conserva el proyecto y su audiencia pública.

**36/36 puntos terminados y verificados; aprobación del usuario pendiente.** Sprint1 aprobado con el mensaje «Apruebo el Sprint 1 y continuar el Sprint 2». Sprint 3 no comienza hasta aprobar Sprint 2. Evidencias actuales: docs/REVERIFICACION_SPRINT_02.md y docs/seguimiento/evidencia-api-sites23.json / evidencia-mapa-sites23.json.

Comprobación:41 pruebas en 8 archivos, TypeScript, auditoría y build correctos; Chrome154 e IAB155,320CSS y texto200%. API y mapa públicos en20idiomas conservan country-DE, punto9.678348/50.961733, centro y zoom3. Información Hausa muestra11 Oktoba, 2026 con Intl incompleto. Selector y ficha continúan funcionando con Storage bloqueado. La revisión lingüística identificada es IA; no se atribuye certificación humana.

## Pasos de revisión de Sites23

1. Menú → Idioma:20 opciones nativas, sin banderas. Buscar English o العربية filtra la lista; seleccionar cambia los controles.
2. Lupa → Alemania → Alemania · País. Cambiar idioma desde la misma tarjeta: resultados y etiquetas se localizan, mientras punto y zoom se conservan. X o clic fuera cierra sin perder la ubicación. Buscar ألمانيا o جرمنی también devuelve el mismo país.
3. Elegir العربية, اردو o پنجابی y abrir Elegir ubicación: panel RTL, coordenadas LTR. Reducir ventana y ampliar texto al 200%: controles alcanzables con desplazamiento vertical.
4. Escenarios → Accidente → Beirut, 2020 → Consultar. Cambiar idioma: contenido localizado, mismos datos y fuentes. En Menú → Información, elegir Hausa: fecha en hausa sin error. Revisar también Disclaimer.
5. Elegir Português y recargar: preferencia manual conservada cuando el navegador permite almacenamiento.
6. Abrir http://127.0.0.1:4174/sprint-02.html:36 terminados, 0 pendientes, 0 no completados. Las flechas permiten revisar operaciones, criterios y evidencia; reapertura manual conservada durante las actualizaciones.

El cierre exige aprobación explícita del usuario conforme a docs/PROTOCOLO_DE_SPRINTS.md. Esta entrega está lista para esa revisión.

---

# Historial: revisión anterior del Sprint 2

**Registro histórico de la entrega 21.** La solicitud posterior de conservar abierta la búsqueda modifica el contrato de 1B en el plan19. La aceptación de esta entrega se retiró y sus criterios volvieron a pendiente; el desarrollo y las pruebas anteriores se conservan como historial. Se requiere aprobación vigente de la nueva entrega del Sprint1 y nueva comprobación del Sprint 2 antes de presentar otra aceptación. Consultar docs/CAMBIO_BUSQUEDA_PERSISTENTE.md y los HTML actuales.

Entrega pública: https://atlas-escenarios-hud.yerrybatista.chatgpt.site/

Sites versión **21**, publicada correctamente el 11 de octubre de 2026 a las 09:18:24 de Santo Domingo. Fuente: `f3aa0928986dca7761a43532c746e0fef8c212f8`. Versión guardada: `appgprj_6aca23222ed881919537ddd318f39d79~appgver_b46fe40cc8148191b23e6f5f13d51228`. Despliegue: `appgdep_6acb8c96ea408191b4abc46757345010`. La versión 21 sustituye la 20 e incluye la corrección del error de búsqueda cuando faltan servicios.

Seguimiento en vivo: http://127.0.0.1:4174/sprint-02.html. Fuente local del informe: `docs/seguimiento/sprint-02.html`. Plan v18: tres bloques, 36 operaciones y criterios terminados y verificados. La aprobación humana del Sprint 2 está pendiente; el Sprint 3 no ha comenzado.

## Comprobación realizada

TypeScript, auditoría de veinte catálogos de 84 claves y 271 nombres por idioma, compilación de producción y 40 pruebas en ocho archivos pasan. Se revisaron escritura, composición y texto ampliado en Chrome y el navegador integrado. Los catálogos tienen revisiones identificadas por IA, documentadas en docs/i18n, y nombres contrastados con fuentes fijas CLDR48/Natural Earth. No se atribuye revisión humana ni certificación lingüística.

En la versión pública 21 se recorrieron los veinte idiomas: el punto 9.678348/50.961733, centro, zoom 3 e identificador country-DE permanecieron idénticos mientras la etiqueta de Alemania y los controles cambiaban. El buscador público devolvió country-DE y HTTP200 para جرمنی en pnb-Arab. La elección manual shahmukhi sobrevivió a una recarga. Chrome público mostró las veinte opciones y documento árabe RTL sin errores de consola. Las fuentes, catálogos y clasificación geográfica corresponden a la edición `countries-cldr48-ne20261011-554aaaf21aba`.

## Pasos para aceptar la entrega

1. Abrir el portal y pulsar el botón de tres líneas **Menú → Idioma**. Comprobar las veinte opciones con nombres nativos, sin banderas. Escribir English o العربية en Buscar idioma: la lista se filtra y la selección cambia los controles.
2. En español, pulsar la lupa, buscar **Alemania** y elegir **Alemania · País**. Abrir Menú → Idioma y alternar español, inglés, árabe, hindi y chino. Los nombres de países y controles cambian; el punto, su ubicación y el zoom permanecen. La etiqueta bajo el marcador puede estar tapada por él; pueden comprobarse también los países vecinos.
3. Abrir la búsqueda, escribir **ألمانيا** o **جرمنی** y buscar. Se obtiene Alemania con su nombre en el idioma elegido. Cambiar idioma con el selector del mismo panel: los resultados existentes se relocalizan sin modificar la consulta ni introducir calles, direcciones o comercios.
4. Elegir **العربية**, **اردو** o **پنجابی**. Abrir Elegir ubicación: los paneles siguen la dirección de lectura correspondiente, las coordenadas siguen siendo legibles y el mapa mantiene su orientación. Reducir el ancho de la ventana y aumentar el tamaño del texto: los controles continúan accesibles.
5. Abrir Escenarios → Accidente → **Beirut, 2020** y su contexto. Cambiar idioma en la ficha; después revisar Menú → Información y Disclaimer. Cambian los textos existentes, conservando las fuentes, el contenido y el punto seleccionado. No se añaden afirmaciones de nuevas funcionalidades de futuros sprints.
6. Elegir **Português** o cualquier idioma y recargar. La selección manual se conserva cuando el navegador permite almacenamiento. Sin selección guardada se utiliza la primera preferencia compatible del navegador y, si no existe, español.
7. Abrir el HTML del Sprint 2: comprobar 36 terminados, tres bloques colapsados y aprobación pendiente. Desplegar cada bloque con su flecha para revisar operaciones, evidencia y criterios de aceptación al final de su tabla.

Comprobación opcional de una excepción: seleccionar मराठी, centrar 115.81956/10.72954 con Elegir ubicación, alejar hasta ver Spratly Islands, pulsar su etiqueta y abrir la ubicación. Se muestra el nombre original y una explicación traducida de la ausencia de traducción verificada. La alternativa está registrada por entidad, no reemplaza un idioma completo.

El cierre requiere un mensaje explícito del usuario aprobando el Sprint 2. Una solicitud de cambios lo mantiene abierto y obliga a volver a comprobar los puntos afectados.
