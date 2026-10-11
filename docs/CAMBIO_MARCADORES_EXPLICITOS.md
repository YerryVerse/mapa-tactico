# Marcadores y selección explícita · Plan20

Instrucción del usuario del11/10/2026: «Vamos a evitar que cuando se le de click al mapa se le ponga el marcador de la detonacion eso debe ir cuando el usuario decida que explosión recrear y cuantas, porque puede decidir ejecutar varias».

La exploración no coloca ni mueve una detonación. La búsqueda y la edición de coordenadas conservan una referencia interna para navegar y consultar, sin el círculo con +. En Elegir ubicación se pueden consultar etiquetas de países explícitamente, sin crear un marcador. Las capas de casos documentados aparecen solo después de una consulta solicitada y se limpian al cerrar.

La selección de eventos y su cantidad es independiente de esa referencia. El plan exige colección y selección explícita en los flujos de catálogos; todavía no se entrega una interfaz de ejecución múltiple. Este cambio retira el marcador automático y evita confundir ubicación con detonación, conservando el alcance del portal y sus registros históricos.

La aprobación de Sites22/Sprint1 y la revisión de Sites23/Sprint2 quedan retiradas por cambio de contrato. El historial se conserva. Se trabaja primero la revisión de Sprint1; Sprint2 y los posteriores no avanzan hasta una nueva aprobación explícita. Se sincronizan los diez HTML con el plan20. Por instrucción del usuario, las verificaciones de esta entrega usan únicamente el navegador integrado; Chrome se reserva para el final del desarrollo.

Implementación: retirada del Marker de ubicación y su estilo, guardia del clic de exploración, consulta explícita de etiquetas en Ubicación y retirada de la frase que prometía colocar/arrastrar el marcador en los veinte catálogos. Las dos primeras frases de Información se conservan literalmente en cada idioma; no se incorpora traducción nueva.

Verificación y versión publicadas: pendientes durante la ejecución; no atribuir éxito a pruebas aún no realizadas.
