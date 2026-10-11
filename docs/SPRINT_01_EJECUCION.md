# Ejecución del sprint 1

Actualización: 11 de octubre de 2026 UTC. Plan v15. El sprint está en curso, sin aprobación del usuario. Este documento registra una publicación parcial; no constituye una entrega completa.

Portal: https://atlas-escenarios-hud.yerrybatista.chatgpt.site/ . Última publicación probada: commit 656854dd2b5bb427687b4a97f134a39551914a43, versión appgprj_6aca23222ed881919537ddd318f39d79~appgver_ab21841adddc819187038c0a4e101d91, estado succeeded a las 10:36:34 UTC. Mismo proyecto, ahora con audiencia pública autorizada por el usuario11oct2026 y confirmada por Sites revisión2. El código publicado no requiere el servidor local del PC. Los informes locales son exclusivamente de seguimiento.

## Bloque 1A

Completado y verificado. Ver DECISION_CARTOGRAFICA.md para proveedor, licencias, cobertura y mediciones. Se revalidaron sus criterios después de actualizar el plan v8 y publicar los controles. En la versión b1ff92e18530819187350938919a0293: carga fría 1958,6 ms, 143,71 fps, respuesta 7,1 ms; Santo Domingo 5 metros = 35,311 píxeles CSS a zoom19, centro y referencia originales conservados al regresar a zoom1,25. Veinte escrituras dentro del mapa comprobadas visualmente. Los cambios posteriores afectan la separación del panel y atribución mediante ResizeObserver; no cambian proveedor, fuentes ni worker.

## Bloque 1B

Implementados y comprobados: retiro de cabecera, marca flotante, mapa 100dvh, zoom acumulado al pulsar rápidamente, regreso global, punto único, marcador arrastrable, edición por coordenadas, controles de teclado, cierre con Escape y restauración del foco, escala solo a partir de zoom8, atribución legible y panel separado de ella. La cámara y el punto elegido son independientes. No hay punto inicial ni panel abierto al entrar.

Prueba publicada de cuatro pulsaciones rápidas: zoom15 → zoom19; segmento de 5 metros 35,311px. Regreso global a zoom1,2499999759 y centro -30,20 (redondeo de animación), manteniendo las coordenadas del punto. Arrastre del mapa conserva el punto; quitarlo elimina el marcador. Las pruebas de gestos y de coordenadas se ejecutaron con Chromium155 en Windows. Sin nuevos errores inesperados de carga.

En Chromium se indujo pérdida del contexto con WEBGL_lose_context; se desactivaron los controles que necesitan mapa y Reintentar recuperó el globo conservando la ubicación. También se indujo la ausencia de WebGL2 durante la construcción del mapa: búsqueda, editor y enlaces a fichas siguieron accesibles. Se consultaron las dos fichas existentes con sus fuentes. Estas pruebas son inyección controlada de fallos, no evidencia de un dispositivo físico sin GPU. Los cambios temporales se retiraron.

Ancho320 × alto568 CSS probado por emulación. Texto al200% mediante duplicación temporal de tamaños computados: contenido del panel desplazable, foco de Buscar visible, sin desbordamiento horizontal. En la última versión, atribución comienza en y484 y panel termina en y472, con separación12px. No hay superposición. Se restablecieron tamaños y viewport. Esta comprobación no se registra como otra versión de navegador.

TypeScript, siete pruebas automatizadas del portal y build oficial de Sites pasan. Tras corregir el texto histórico del seguimiento, su prueba integral también pasa; no modifica los estados reales durante sus pruebas.

### Pendientes que impiden cerrar el bloque

1. Elegir y configurar el proveedor de búsqueda exclusivamente de países y ciudades, según la instrucción del usuario del 11 de octubre de 2026. El servidor valida consultas y devuelve400 para entradas inválidas y503 para falta de configuración, sin resultados inventados ni solicitudes a un proveedor no elegido. La interfaz cancela solicitudes y descarta respuestas obsoletas. Faltan búsqueda real, límites del proveedor, cuota distribuida, caché autorizada, lista permitida de tipos país/ciudad que excluya calles, direcciones, edificios, barrios, POI y tipos desconocidos, y pruebas de recuperación/429. Geoapify requiere clave propia. Nominatim público requiere decisión informada, búsqueda manual, límite global de1solicitud/s, sin autocompletado y cumplimiento de https://operations.osmfoundation.org/policies/nominatim/ . Photon demo no se usa para producción.
2. Matriz web pendiente: Firefox. Chromium155 tiene evidencia real; la revisión responsiva utiliza ventanas de distintos tamaños y texto ampliado. La exigencia anterior de plataformas adicionales fue retirada por instrucción del usuario el11oct2026.

Los puntos de búsqueda y matriz permanecen rojos. Los criterios completos de1B no pueden aprobarse mientras sus operaciones sigan incompletas. El bloque1C permanece pendiente según el orden de aceptación; todavía falta su recorrido de paneles, registro de capacidades, renderizador común y revisión completa. Las fichas simples actuales sirven como lectura accesible de1B, sin presentarse como ese recorrido final.

El seguimiento HTML tiene la fuente autoritativa en estado.json. No se ha ejecutado review ni approve y no se ha iniciado el sprint2. La guía parcial describe exactamente lo que ahora puede comprobarse; se sustituirá por la guía completa cuando los55puntos del sprint estén verificados.

## Fondo exterior negro · 11 de octubre de 2026

Publicado fondo CSS y cielo cartográfico #000000; el océano conserva #003876 y la tierra sus tonos azules. Vista global publicada comprobada en Chromium Windows a1247×764, sin cabecera, panel ni punto inicial. Calles y selección siguen funcionando: zoom19 en Santo Domingo,5m=35,311px, regreso global correcto. Siete tests, TypeScript y build oficial Sites pasan. Proveedor, geometría, fuentes, worker y controles no cambian. Mediciones de rendimiento y escrituras anteriores son evidencias anteriores, no nuevas ejecuciones. El sprint sigue abierto, sin aprobación humana.

## Estrellas discretas ·11oct2026

Capa SVG local estática con140 círculos pequeños de opacidad0,2–0,65 bajo el canvas. Semilla fija, sin peticiones externas, animaciones, gestos ni foco. Publicación comprobada en Chromium1247×764: estrellas únicamente en espacio exterior negro; globo azul y nombres legibles. Vista local15 comprobada sin estrellas sobre calles; TypeScript y build oficial pasan. Motor, estilo, geometría, fuentes y worker sin cambios. El sprint permanece abierto y sin aprobación humana.

## Plan v14 y buscador — 11oct2026

Por instrucción del usuario, los diez sprints cubren exclusivamente una web app responsiva, con verificación de navegadores y dimensiones de ventana. Guías, evidencias y HTML actualizados mediante el generador; registro de fechas y estados conservado. La consulta anterior sobre plataformas adicionales dejó de ser necesaria. La prueba del seguimiento pasa en carpeta temporal; el análisis de referencias del proyecto no encontró requisitos excluidos.

Contrato compartido de búsqueda estricto: consulta2–160 caracteres, máximo8resultados, tipos país/ciudad, coordenadas finitas, respuestaJSON de máximo64KiB, tiempo8s, cancelación y descarte de respuestas antiguas.13/13 pruebas pasan, TypeScript y build oficial pasan. Publicación ab21841adddc819187038c0a4e101d91 comprobada: etiqueta País o ciudad y error503 real sin resultados inventados. Ventana320×568 sin desbordamiento y Escape restaura foco. No se probó una consulta real a un proveedor ni se afirma que estén terminados el adaptador, la cuota global o la caché.

Bloque1A revalidado por revisión de evidencias, igualdad de sus archivos cartográficos, build, pruebas y carga publicada. La modificación documental no cambia motor, fuentes ni geometría; las métricas anteriores se conservan identificadas como mediciones anteriores. Bloque1B abierto: decisión de proveedor pendiente y Firefox sin verificación. Bloque1C no iniciado. Ningún sprint aprobado.
