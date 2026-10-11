# Búsqueda con selección sucesiva

Solicitud del usuario, 11/10/2026: seleccionar una ciudad debe mantener abierta la tarjeta para poder seleccionar otras. Cierre con X o clic fuera. El plan19 incorpora el requisito a 1B-05 y su criterio de aceptación; se reabre el Sprint1 y se invalidan las aceptaciones dependientes conservando el historial. La aprobación anterior no se reutiliza para este cambio.

## Implementación

choosePlace actualiza punto, país y centro/zoom sin llamar a close ni limpiar resultados. El panel conserva su instancia y la consulta. Un listener de click en captura cierra únicamente la búsqueda al pulsar fuera: impide que el clic de cierre sobre el mapa genere un nuevo punto. El seguimiento de pointerdown/pointermove distingue arrastres de más de seis píxeles; no se cierra por explorar arrastrando. La navegación a otras herramientas continúa con sus handlers normales. X, Escape, historial y restauración del foco usan el cierre existente.

## Evidencia local

TypeScript, auditoría de veinte catálogos, 40 pruebas y compilación de producción pasan. IAB: Santiago de Chile, Santiago de los Caballeros y Santiago de Cuba seleccionados consecutivamente, #search y ocho resultados conservados. Un clic sobre una fila ya visible mantiene scrollTop210px y cambia únicamente el punto a -70.69085/19.45036. El desplazamiento que la herramienta hace para alcanzar una fila fuera de vista no se confunde con un cambio provocado por la aplicación.

Arrastre del mapa mantiene tarjeta, ocho resultados y punto. Clic fuera cierra y conserva exactamente -70.69085/19.45036; foco vuelve a Buscar lugar. X tras elegir Santiago de Cuba con Enter conserva -75.82171/20.02287. Escape también cierra. Chrome repite selección Chile/República Dominicana con consulta Santiago y ocho resultados, y X conserva el punto.

Regresión cartográfica local: veinte muestras de escritura dentro del mapa; SD zoom19, cinco metros35.311237px; referencia y centro -69.8845/18.4737 intactos al volver a zoom1.25. Medida143.707794fps y7.4ms hasta el primer render durante animación de3006.1ms. El código del motor, worker, estilo, fuentes, API y catálogos no cambió frente a Sites21. La evidencia anterior de latitudes, cobertura y recuperación gráfica se conserva como histórica; no se declara una repetición de esas pruebas.

La versión y evidencia pública se añadirán después de la publicación. El Sprint2 conserva su desarrollo, pero su nueva aceptación queda pendiente de la aprobación vigente del Sprint1 según el protocolo.

## Entrega publicada y comprobada

Sites22, fuente a8d62202c3453d086d43079ee8f66f866835e69a, publicada el11/10/2026 a09:41:11 Santo Domingo. Versión appgprj_6aca23222ed881919537ddd318f39d79~appgver_c44429d7447c8191bd63e6ee4b78488b; despliegue appgdep_6acb91ecf41c8191b05bc56170d63a0e. Portal público: https://atlas-escenarios-hud.yerrybatista.chatgpt.site/.

En producción: tres ciudades de Santiago elegidas manteniendo tarjeta, consulta y ocho resultados. X conserva Santiago de Cuba. Después, clic fuera conserva Santiago de Chile exacto -70.64827/-33.45694 y devuelve foco a Buscar lugar. La ficha Beirut mantiene la ubicación y firma context-20261011-2, con fuente ONU; cierre vuelve al mapa. Inicio local390x844 y1440x900: área visible completa, cero paneles y ningún overflow. Atrás desde búsqueda devuelve exploración. Overrides temporales retirados.

La nueva revisión del Sprint1 está lista para aprobación humana. El desarrollo del Sprint2 se conserva, pero sus criterios siguen pendientes hasta contar con aceptación vigente del Sprint1 y reverificarlos. No se ha iniciado Sprint3. Para comprobar el ajuste, buscar Santiago, elegir dos o tres ciudades, verificar lista persistente y cerrar con X o clic sobre el mapa; debe conservarse la última ciudad seleccionada.
