# Plan de sprints para el portal ATLAS

Fecha: 10 de octubre de 2026. ATLAS es el nombre provisional. Este plan convierte los requisitos acordados en diez entregas funcionales para las IA que desarrollarán el portal. La prioridad es que el usuario pueda explorar el mundo y acceder a información útil sin que paneles, mensajes o decoración dificulten el mapa.

Revisión técnica: versión 15 del plan, del 11 de octubre de 2026. Portal público en Sites, sin cuentas, registro, inicio de sesión, contraseñas ni claves aportadas por visitantes. Todas sus consultas funcionan anónimamente. Conserva las veinte soluciones iniciales y los doce hallazgos de la auditoría final, junto con la presentación del seguimiento acordada. El fondo exterior de la aplicación es negro #000000 con pequeñas estrellas discretas; el globo conserva sus azules y componentes blancos. La búsqueda geográfica se limita a países y ciudades; excluye calles, direcciones y puntos de interés tanto en el proveedor como en el servidor. Los diez HTML reflejan operaciones, criterios y reglas vigentes; documentar una solución no acredita su implementación. El detalle de los hallazgos está en [Revisión técnica de los sprints](REVISION_TECNICA_SPRINTS.md); la regla persistente de ejecución está en [Seguimiento y aprobación de los sprints](PROTOCOLO_DE_SPRINTS.md) y en AGENTS.md.

El usuario autorizó iniciar el sprint 1 el 10 de octubre de 2026. Su ejecución y las publicaciones parciales se registran en el HTML y en estado.json; una publicación parcial no constituye una entrega aceptada ni el cierre del sprint. Se conserva la aprobación humana al final de cada sprint.

## Reglas de ejecución

El portal es exclusivamente una web app responsiva. Las verificaciones se realizan en navegadores web y distintos tamaños de ventana, sin requerir sistemas operativos adicionales, aplicaciones nativas ni equipos específicos. Esta regla se aplica a los diez sprints.

1. Cada sprint entrega una función completa: interfaz, comportamiento, datos cuando correspondan, traducciones, errores y validación. No se cierra una tarea con botones sin función, datos de prueba presentados como definitivos o integraciones pendientes de otro sprint.
2. Los sprints pueden utilizar funciones terminadas en entregas anteriores. Sus dependencias deben estar resueltas antes de comenzar; no se crean puntos cuyo cierre dependa de una entrega futura.
3. Las operaciones dentro de un bloque son pasos de una misma entrega. Si la división permite cerrar una parte que todavía no tiene utilidad para el usuario, conservar el bloque unido.
4. Antes de comenzar, leer el código, las instrucciones del repositorio y este plan. Las IA deben conservar el trabajo existente y no introducir funciones ajenas al alcance, como cuentas, pagos, una comunidad o un sistema de publicación de escenarios.
5. Cada elemento visible debe responder a una acción, un dato, una unidad, una fuente o una decisión del usuario. Eliminar títulos repetidos, numeraciones decorativas, subtítulos genéricos, indicadores de versión y mensajes que narran acciones evidentes.
6. Los estados de carga y los errores sí tienen utilidad. Mostrarlos solamente donde ocurre el problema, con una acción de recuperación cuando exista; no llenar la pantalla con mensajes permanentes.
7. Las funciones nuevas deben ser utilizables con ratón y teclado. La accesibilidad, los textos y el manejo de errores se terminan en el sprint que incorpora la función.
8. Desde el sprint 2, cada función nueva se entrega en los veinte idiomas. No trasladar sus traducciones a una fase posterior.
9. Conservar el identificador del proyecto Sites y su audiencia al implementar. Los cambios de nombre no crean otro sitio ni cambian su acceso automáticamente.
10. No fijar fechas o velocidad de desarrollo sin conocer la capacidad del equipo, los servicios contratados y los resultados de las decisiones técnicas. Los números indican orden, no semanas.
11. Definir cobertura mínima, capacidades opcionales y contratos antes de construir cada función. «Si hay datos» no puede servir para cerrar un bloque sin su función principal: seleccionar primero un caso viable o informar el bloqueo.
12. Utilizar una versión fijada de cada dependencia y un archivo de bloqueo. Ninguna URL de ejecución debe depender de latest ni de un recurso de demostración que se asuma como servicio de producción.
13. Abrir el HTML del sprint al comenzar y actualizar su tabla después de cada transición real. Verde con letras blancas: terminado y verificado; naranja: en curso; rojo con letras blancas: no completado, fallo o bloqueo; sin relleno y letras negras: pendiente. Cada estado incluye texto y evidencia cuando corresponda. No esperar al cierre para registrar avance.
14. El usuario aprueba el final de cada sprint. Los puntos verdes no cierran automáticamente el sprint. Preparar URL y versión revisables, evidencia y pasos concretos para comprobar funcionalidades en el portal; después, esperar su aprobación explícita antes de comenzar el siguiente sprint.
15. No comenzar el siguiente bloque hasta terminar y verificar las operaciones y todos los criterios de aceptación del anterior. Registrar evidencia por criterio. Un fallo mantiene el bloque abierto; corregirlo y repetir las comprobaciones antes de avanzar. No se exige aprobación humana adicional por bloque: la aprobación del usuario corresponde al cierre del sprint.
16. Estas reglas son persistentes hasta terminar el proyecto. Los informes administrativos se conservan fuera de la interfaz del portal. No sustituir la comprobación de una función por la existencia de una solución escrita en el plan.

### Informe y aprobación de cada entrega

Cada sprint tiene un archivo HTML con todas sus operaciones y criterios de aceptación, agrupados en tablas por bloque. Los criterios se muestran al final de su bloque; no forman una sección aplazada hasta el final del sprint. [Índice de seguimiento](seguimiento/index.html). Los archivos `seguimiento/sprint-01.html` a `seguimiento/sprint-10.html` incluyen tabla, evidencia y guía manual prevista. Antes de pedir aceptación, ajustar la guía a los controles y resultados realmente desarrollados y registrar URL y versión de la entrega. La aprobación del usuario permanece separada del progreso técnico; sin respuesta, el sprint sigue abierto. Consultar el [protocolo de seguimiento](PROTOCOLO_DE_SPRINTS.md) para actualización en vivo, comandos y registro de cambios.

### Alcance de los datos y resultados

La población real sirve para explorar demografía y, cuando existe un área documentada, contabilizar población dentro de ella. Ese total no representa heridos ni fallecidos. Los recuentos históricos de víctimas se presentan con evento, fecha, fuente y definición.

La categoría Militar incluye contexto humanitario, acontecimientos históricos y pruebas nucleares documentadas. No se desarrollará una herramienta que permita colocar armas en ubicaciones reales y calcular bajas, áreas de daño o resultados de ataques. Esta limitación ya fue comunicada durante la conceptualización y debe mantenerse en el código y en los contratos de datos.

Para accidentes y fenómenos naturales, este plan entrega consulta de antecedentes, población y áreas documentadas. No encarga inventar tasas de mortalidad ni presentar una predicción de víctimas sin un modelo validado para ese fenómeno. Cualquier futura ampliación a predicción física requerirá un alcance y una validación propios; no constituye una tarea pendiente de estos sprints.

El propósito del portal y sus limitaciones extensas estarán en el disclaimer. La interfaz no repetirá avisos sobre simulación o uso educativo. Cada cifra conservará su significado mediante una etiqueta breve, por ejemplo «Población en el área», «Víctimas registradas» o «Estimación». Los resultados arbitrarios del prototipo se retiran en el sprint 1; la limpieza visual no se realiza ocultando su naturaleza. Los resultados nuevos utilizan fuentes y definiciones verificables.

## Documento de control del cumplimiento

Alcance web vigente: portal público, sin cuentas, registro, inicio de sesión, contraseñas ni claves del visitante. Verificar páginas y consultas como visitante anónimo. Comprobar adaptación a ventanas estrechas y amplias, ratón, teclado y texto ampliado. No exigir plataformas adicionales ni aplicaciones nativas en ningún sprint.

El plan define lo que se debe desarrollar; el HTML de cada sprint permite vigilar que se cumple. Ambos deben reflejar las instrucciones del usuario. Actualizar el contenido del plan y regenerar los HTML cuando cambien requisitos o reglas; actualizar la tabla durante la ejecución cuando cambie el estado de un punto. La actualización automática de la pantalla facilita la consulta, pero no sustituye el registro de requisitos, evidencias ni aprobación. Estas reglas se incluyen en todos los HTML y permanecen vigentes hasta finalizar el proyecto.

1. Correspondencia con el plan: cada HTML debe incluir todas las operaciones y criterios de su sprint, con identificadores estables, texto vigente y versión del plan. Ningún requisito se considera cumplido solo por estar documentado.
2. Presentación del documento: fondo blanco; títulos de bloques y columnas en azul #003876 con letras blancas. Cada bloque tiene su propia tabla. Las filas «Terminado» tienen fondo verde y letras blancas; las filas «No completado», fondo rojo y letras blancas; las filas «Pendiente», sin relleno y letras negras. Las filas «En curso» conservan fondo naranja y texto negro. Los indicadores comparten exactamente el fondo y el color del texto de su fila, sin recuadro ni otro tono.
3. Estados verificables: verde significa terminado y comprobado con evidencia; naranja significa en curso; rojo significa intento no completado, fallo o bloqueo; sin relleno y texto negro significa pendiente. Conservar el texto del estado además del color y explicar los fallos.
4. Registro durante el trabajo: actualizar el HTML al iniciar, completar, verificar o bloquear cada punto. No esperar al final del sprint. Los cambios de requisitos se registran primero en el plan y se sincronizan sin perder el historial. Si cambia un sprint previo o un contrato común, retirar las aceptaciones afectadas y posteriores y volver a comprobar sus criterios antes de continuar; conservar las evidencias anteriores como historial, sin tratarlas como aceptación vigente.
5. Aceptación por bloque: colocar sus criterios al final de su tabla, después de las operaciones. Cada criterio requiere una comprobación y evidencia propias; no marcarlo cumplido mientras existan operaciones incompletas en el bloque.
6. Orden obligatorio: no comenzar el siguiente bloque hasta cumplir todas las operaciones y criterios del anterior. Mostrar qué bloque impide avanzar; ante un fallo, corregir y volver a verificar antes de continuar.
7. Secciones plegables: colapsar un bloque cuando todas sus operaciones y criterios estén terminados y verificados. Mantener una flecha para abrirlo; respetar la apertura manual y volver a desplegarlo si reaparece trabajo pendiente. Colapsar no equivale a aprobar.
8. Entrega para revisar: al final del sprint, registrar la URL y versión realmente comprobadas y explicar qué funcionalidades debe ver el usuario, cómo probarlas y qué resultado esperar. Mantener el sprint esperando aprobación hasta recibir respuesta explícita.
9. Aprobación del usuario: solo el usuario puede aprobar el cierre de un sprint. Registrar su mensaje como evidencia y no comenzar el siguiente sprint antes de esa aprobación. Si pide cambios, mantener abierto el sprint y actualizar los puntos afectados.
10. Vigencia y separación: conservar estas reglas durante todo el proyecto y mantener el documento de control fuera del portal. La pantalla local debe reflejar el HTML actualizado sin recarga manual; las consultas periódicas no deben generar escrituras si no hay cambios reales.

## Arquitectura de referencia y decisiones técnicas

### Base de implementación

La fuente actual es un sitio estático con D3, archivos en dist y sin API ni base de datos. El alcance nuevo necesita servicios de búsqueda y población, además de cartografía con calles. La arquitectura de referencia será TypeScript, React y el starter de servidor oficial de Sites basado en Vinext, conservando su integración de compilación y publicación. La migración se completa en el sprint 1 junto con el mapa y la búsqueda, no se aplaza hasta que una función requiera un servidor inexistente.

La estructura propuesta separa app para páginas y rutas de servidor, componentes de mapa y paneles, servicios de proveedores, contenido versionado, catálogos de idioma y pruebas. El mapa se inicializa únicamente en el navegador; su importación o sus accesos a window no deben ejecutarse durante renderizado de servidor. Mantener las preferencias de idioma en el cliente sin provocar discrepancias de hidratación.

| Necesidad | Tecnología o contrato de referencia | Sprint que la entrega |
| --- | --- | --- |
| Aplicación y servidor | TypeScript, React, starter Vinext de Sites y su configuración de Vite | 1 |
| Globo y calles | MapLibre GL JS 6.x, distribución ESM y estilo vectorial propio; fijar versión exacta tras validar compatibilidad | 1 |
| Datos del mapa | Proveedor de teselas vectoriales, estilo, sprites y servicio de glifos con cobertura y licencia comprobadas | 1 |
| Búsqueda | Adaptador a un proveedor de países y ciudades; lista permitida de tipos en servidor, sin calles, direcciones ni POI; intermediación para secretos y cuotas | 1 |
| Interacción y contenido común | Estado explícito, registro de capacidades, renderizador de fichas, fuentes y limpieza de capas | 1 |
| Idiomas | Catálogos JSON, Intl del navegador con alternativas verificadas y catálogo propio de países por identificador | 2 |
| Edición de áreas | Terra Draw y adaptador MapLibre; GeoJSON validado y compatibilidad de proyección comprobada | 3 |
| Población por área | Ingesta fuera del Worker con Python y GDAL o Rasterio; datos preparados y consultas acotadas desde el servidor | 3 |
| Metadatos y agregados | D1/Drizzle, bindings y migraciones según starter Sites; catálogo y agregados preparados, sin presumir un motor GIS | 3 |
| Validación de runtime | Esquemas compartidos de peticiones, respuestas y fichas; Zod como candidata comprobada con Workers | 1 y cada contrato nuevo |
| Operaciones geométricas | Motor fijado para intersección/unión; método de superficie y normalización del meridiano 180 comprobados | 3 |
| Formato poblacional | Bloques acotados, máscara NoData y lector TypeScript versionado compatible con ingesta y runtime | 3 |
| Archivos geográficos | R2 para bloques de población y geometrías cuando su tamaño exceda activos normales; acceso por fragmentos y versiones | 3 |
| Contenido histórico y científico | Archivos JSON revisados y validados, con identificadores de evento y fuente compartidos | Cada sprint de contenido |
| Gráficos de energía | SVG y D3 para escalas y diagramas, acompañados de tablas legibles y navegación por teclado | 9 |
| Pruebas | Vitest para contratos y cálculos, y Playwright o la herramienta de navegador disponible para recorridos; fijar versiones compatibles | Cada función que se incorpora |

MapLibre dispone de un ejemplo oficial de globo con mapa vectorial, y su documentación enumera la integración de Terra Draw. La edición de polígonos debe validarse con la versión y proyección elegidas; la existencia de un adaptador no prueba por sí sola todos los gestos en un globo. [Globo vectorial de MapLibre](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/), [Integraciones de MapLibre](https://maplibre.org/maplibre-gl-js/docs/plugins/).

MapLibre 6 exige WebGL2 y usa módulos ESM. Verificar GPU, navegador, carga de workers y política de seguridad del contenido en la versión publicada. Detectar pérdida de contexto y permitir recuperación; si no hay GPU compatible, conservar acceso a búsqueda y fichas mediante una vista textual con explicación breve, sin prometer un globo que ese dispositivo no puede dibujar. [Guía de migración de MapLibre 6](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/).

### Procesamiento de población y límites de infraestructura

El servidor de Sites se ejecuta en Workers; el procesamiento de archivos mundiales no debe ocurrir dentro de una petición web. Cloudflare documenta un límite de memoria de 128 MB por isolate y límites de CPU. La elección de R2 para archivos y D1 para metadatos no elimina esos límites. [Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/).

La ruta de referencia prepara datos fuera del Worker: descarga de una edición fijada, comprobación de unidades y NoData, división en bloques consultables, sumas administrativas y manifiesto de archivos. El Worker devuelve agregados o suma bloques pequeños dentro de límites medidos. No instalar GDAL como si fuese una biblioteca disponible en el runtime web. El pipeline se ejecuta manualmente durante ingesta y actualización; no se encargan automatizaciones recurrentes.

Antes de programar las consultas, demostrar un caso de ciudad y uno de polígono con un conjunto real. Si el cálculo por bloques no cumple límites, elegir y configurar un servicio GIS externo por HTTPS dentro del mismo sprint 3. Resolver alojamiento, coste, credenciales y validación antes de construir la interfaz dependiente. Una API de estadísticas zonales ya disponible puede reemplazar el pipeline solo si demuestra las mismas unidades, cobertura, licencia y operación geográfica; una API de catálogo o descarga no es suficiente.

La documentación REST de WorldPop consultada describe metadatos y enlaces GeoTIFF. No se ha verificado en esta revisión un contrato de API que calcule cualquier polígono con las condiciones requeridas. No asumirlo a partir del nombre WorldPop API. [Documentación REST de WorldPop](https://www.worldpop.org/sdi/introapi/).

Las geometrías administrativas grandes se guardan como archivos versionados, no como millones de filas de celda dentro de D1. La consulta por identificador administrativo obtiene un agregado de su perímetro y edición, sin necesidad de recorrer el raster completo al abrir una ciudad.

### Decisiones que deben resolverse dentro de cada bloque

| Decisión | Responsable del bloque | Evidencia necesaria antes del código dependiente |
| --- | --- | --- |
| Proveedor de teselas y glifos | IA del sprint 1 y titular del servicio si requiere contratación | Cobertura, zoom, licencia, coste, clave, CORS y prueba de carga desde Sites |
| Proveedor de búsqueda | IA del sprint 1 | Países y ciudades exclusivamente, tipos identificables, idiomas disponibles, cuotas, atribución y política sobre sugerencias |
| Versión de MapLibre y entorno | IA del sprint 1 | Globo, calles, ESM, WebGL2, recuperación y build del starter funcionando |
| Traducciones y revisión | IA del sprint 2 y revisores de idioma identificados | Veinte catálogos completos, glifos y formatos verificados; ausencia de revisión no se declara como revisión hecha |
| Fuente poblacional y edición | IA del sprint 3 | Conjunto descargable, unidades, límites administrativos, cobertura, licencia y manifiesto de datos |
| Ruta de cálculo y presupuesto | IA del sprint 3 | Consulta real dentro de límites o servicio GIS externo disponible y configurado |
| Casos históricos y geometrías mínimas | IA de cada sprint de contenido | Casos seleccionados y fuentes completas que permitan cumplir la función de ese bloque |
| Nombre e identidad | IA del sprint 8 y usuario para la selección | Recomendación concreta y elección antes de aplicar la identidad definitiva |

Estas decisiones son operaciones de los bloques correspondientes, no puntos abiertos que deban completarse en otro sprint. Una contratación o elección que requiera al usuario se presenta con opciones y consecuencias concretas; no se inicia código que dependa de un servicio todavía inexistente.

### Servicios externos y uso responsable de recursos

No usar teselas de demostración como servicio definitivo ni un endpoint público sin revisar su política. La API pública de Nominatim prohíbe autocompletado; por tanto, no se elige como base de las sugerencias del buscador. Utilizar un proveedor que permita esa función o una instancia gestionada con esa capacidad. [Política de Nominatim](https://operations.osmfoundation.org/policies/nominatim/).

El adaptador de búsqueda aplica espera breve entre escritura y consulta, longitud mínima, cancelación, límite de resultados, caché cuando la licencia lo permita y tratamiento de cuotas. Solo admite resultados de países y ciudades: configurar los tipos del proveedor y aplicar una lista permitida independiente en el servidor antes de responder o cachear. Rechazar calles, direcciones, edificios, barrios, comercios, otros POI y tipos desconocidos. No basta con ocultarlos en la interfaz ni ofrecer un modo de búsqueda detallada. Una consulta con nombre de calle o dirección no debe devolver ese objeto; una ciudad homónima solo puede aparecer identificada como ciudad. Esta restricción afecta al buscador, no elimina las calles con nombre del mapa acordado. El servidor llama solo a orígenes configurados, nunca actúa como intermediario de cualquier URL que envíe el usuario. Los errores externos se traducen a códigos propios y mensajes breves; no exponen tokens ni trazas.

Mantener audiencia pública de Sites, autorizada por el usuario el11oct2026, y confirmar su estado al publicar. No hay cuentas, perfiles, registro, contraseñas, inicio de sesión ni claves del visitante. Páginas, fichas y API de consulta aceptan peticiones anónimas. Preferencias locales no constituyen un perfil. La gestión técnica de Sites y las credenciales de servicios, cuando se necesiten, quedan fuera de la experiencia del visitante y no se solicitan para usar el portal.

### Contratos técnicos concretos de la auditoría final

La integración MapLibre/Vite debe publicar el worker del motor y su CSS, con fuentes y composición verificadas antes de fijar versiones. MapLibre v6.13.0, publicada el 6 de octubre de 2026, es una candidata vigente; no se declara instalada ni se usa latest. La guía oficial exige resolver el worker expresamente al usar bundlers. [Guía MapLibre 6](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/), [release v6.13.0](https://github.com/maplibre/maplibre-gl-js/releases/tag/v6.13.0).

Los contratos de entrada, respuesta y contenido necesitan validación de runtime, además de tipos TypeScript; Zod es una candidata a fijar y probar en 1B. La lectura de fichas puede usar archivos estructurados validados y versionados: no necesita una API vacía para aparentar servidor. Los códigos de API distinguen petición inválida, límite de trabajo, cuota, fallo del proveedor y tiempo agotado; validar Content-Type y respuesta antes de renderizar. Un fallo de servicio no solicita iniciar sesión al visitante. [Documentación Zod](https://zod.dev/).

En 3A se fija el formato de población y su lector, y el motor geométrico que posteriormente utiliza 3B. polygon-clipping permite operaciones planas sobre polígonos y multipolígonos; normalización de longitudes, geodesia y rechazo de entradas inválidas se resuelven por separado. GeoJSON mantiene longitud/latitud WGS84; el manifiesto raster declara su propio CRS y transformación. No sumar bloques de países solapados ni perder o duplicar celdas en sus bordes. [polygon-clipping](https://github.com/mfogel/polygon-clipping), [GeoJSON RFC 7946](https://www.rfc-editor.org/rfc/rfc7946), [GeoTIFF GDAL](https://gdal.org/en/stable/drivers/raster/gtiff.html).

La ingesta incluye preparación y carga en el almacenamiento realmente utilizado. Los bindings y las migraciones siguen el starter de Sites; D1/R2 locales no representan por sí solos los recursos alojados. Resolver permisos y canal de carga antes de crear una interfaz dependiente. Si no puede demostrarse ese recorrido, el bloque sigue abierto o entrega el GIS externo ya configurado. Un límite de memoria se mide con los datos expandidos, varias lecturas concurrentes y el resto de la aplicación, no solo con el tamaño comprimido de un archivo. [Límites Workers](https://developers.cloudflare.com/workers/platform/limits/).

En 1B y 3A/3B se fijan límites de consultas y presupuesto: cuota global, concurrencia, lecturas externas y trabajo por petición, con rechazo y recuperación definidos para consultas anónimas. Usar solo mecanismos disponibles en Sites; no presuponer un binding de rate limiting no provisionado ni contadores en memoria capaces de imponer cuotas globales. La protección de cuota no exige cuentas ni identidad del visitante. La caché distingue consulta normalizada, idioma y edición de datos; no guarda perfiles personales.

Las doce correcciones finales se detallan en la revisión técnica. Son especificaciones pendientes de implementación del portal; las reparaciones del generador de seguimiento sí se verifican mediante pruebas aisladas. Se conserva el mínimo de casos y materiales, las veinte traducciones, el alcance científico y la aprobación del usuario.

## Orden y entregas

| Sprint | Bloque funcional | Entrega que podrá utilizar el usuario | Entrada necesaria |
| --- | --- | --- | --- |
| 1 | Globo y experiencia del mapa | Aplicación con servidor, mapa a pantalla completa, calles, zoom y controles útiles | Prototipo disponible; proveedores y compatibilidad se resuelven en el bloque 1A |
| 2 | Idiomas y nombres geográficos | Interfaz y nombres de países en veinte idiomas | Mapa terminado en sprint 1 |
| 3 | Población y consulta territorial | Consultar población real por área con procedencia | Mapa e idiomas terminados |
| 4 | Accidentes | Explorar gas doméstico, gas industrial y Beirut con información pertinente | Consulta territorial y presentación localizada disponibles |
| 5 | Fenómenos naturales | Explorar erupciones y otros fenómenos documentados | Consulta territorial y presentación localizada disponibles |
| 6 | Escenarios militares históricos | Consultar antecedentes y consecuencias documentadas | Mapa e idiomas terminados |
| 7 | Tierra y evidencia científica | Consultar medidas terrestres, HAARP y pruebas subterráneas | Mapa e idiomas terminados |
| 8 | Nombre e identidad del portal | Aplicar una identidad coherente y sus variantes lingüísticas | Criterios de identidad; la selección se resuelve en 8A antes de aplicar 8B |
| 9 | Materiales y relación entre masa y energía | Fichas y comparaciones visuales desde propano hasta uranio, con significado físico y fuentes | Paneles e idiomas terminados |
| 10 | Verificación integral y entrega | Publicación comprobada de las funciones ya terminadas | Sprints 1 a 9 aceptados |

Los sprints 4, 5, 6, 7 y 9 no dependen de funciones aún pendientes entre ellos. Se enumeran en ese orden para mantener el seguimiento; no se encarga trabajo simultáneo por defecto. El sprint 10 verifica el conjunto y la entrega: no recibe controles rotos, traducciones faltantes ni pruebas básicas aplazadas.

## Sprint 1 Globo y experiencia del mapa

### Objetivo y condición de entrada

El usuario encuentra el globo como superficie principal, puede llegar al nivel de calles y abre únicamente los controles que necesita. Antes de implementar, comprobar que el motor y el proveedor seleccionados permiten esta experiencia, que el servicio puede utilizarse desde Sites y que su licencia y sus condiciones de atribución son compatibles.

### Bloque 1A Cartografía y acercamiento

1. Auditar el globo actual y migrar al starter de servidor de Sites definido en la arquitectura. Conservar proyecto, audiencia pública y fuentes del contenido utilizable; integrar el mapa y rutas de servidor de referencia en una aplicación que compile y se publique. Comprobar acceso anónimo sin cuentas, registro, inicio de sesión, contraseñas ni claves del visitante. La integración completa del buscador y del recorrido de fichas se verifica respectivamente en 1B y 1C; no condiciona el cierre de 1A a bloques futuros. El prototipo usa un dibujo de países de baja resolución; aumentar su escala no incorporará calles.
2. Validar MapLibre con vista de globo y navegación continua hasta cartografía local. Si necesita cambiar de proyección al acercar, conservar el centro, el punto seleccionado y la continuidad visual. Resolver esta transición y sus eventos en este bloque.
3. Elegir y documentar proveedor, versión del motor, licencia, atribución, límites de solicitudes y configuración. Las claves privadas se mantienen en el servidor; las claves públicas restringidas se usan solamente si el proveedor permite exponerlas en el navegador.
4. Configurar el fondo exterior de la aplicación y del cielo cartográfico en negro #000000, manteniendo el globo azul #003876, tierra en tonos azules auxiliares y componentes blancos. Agregar puntos pequeños como estrellas únicamente al espacio exterior negro, con distribución discreta y estática, sin cubrir el globo, interceptar gestos o agregar controles al recorrido del teclado. Distinguir claramente el borde del globo del fondo exterior; conservar legibles calles, fronteras y nombres tanto en vista global como al acercar. No añadir fotografías ni una opción de satélite.
5. Mostrar países en la vista global y calles con nombres al acercar. Retirar capas de comercios, establecimientos, monumentos y otros puntos de interés, incluidos sus iconos y etiquetas. No eliminar etiquetas de calles al desactivar puntos de interés.
6. Medir el acercamiento con un criterio reproducible: un segmento geográfico de 5 metros debe ocupar al menos 25 píxeles CSS cerca del centro de la vista local sin inclinación, equivalente a un máximo de 0,2 metros por píxel CSS. Verificar en Santo Domingo, una ciudad cercana al ecuador y una ciudad de latitud media. Registrar viewport, coordenadas, zoom, proyección y resultado. Este es un criterio de escala de visualización, no una promesa de precisión de datos.
7. Si el proveedor permite acercar más que su detalle original, comprobarlo expresamente: no presentar un simple aumento de imagen como nueva resolución. Registrar cobertura y límites reales del servicio.
8. Probar zonas urbanas de varios continentes, áreas rurales, islas, proximidad a polos y cruce del meridiano 180. Conservar exploración global y documentar límites de proyección o cobertura: no prometer calles ni zoom local donde el proveedor no tiene datos. Fuera de cobertura, la navegación mantiene una vista válida y explica el límite al solicitar el detalle.
9. Comprobar ESM, WebGL2, importación solo en cliente, carga del worker cartográfico, glifos, sprites, CORS y política de seguridad del contenido. Una prueba local no sustituye la prueba del build y del dominio Sites.
10. Registrar dispositivo y navegador de prueba, red de referencia y presupuesto antes de medir. Objetivos de implementación: controles locales responden en 200 ms, mapa utilizable en 5 segundos con caché fría en la red fijada e interacción sostenida de al menos 30 fotogramas por segundo en el dispositivo de referencia. Si no se alcanzan, optimizar o presentar al usuario una propuesta concreta de ajuste del objetivo antes de cerrar el bloque; no reducirlo por decisión de la IA ni cambiar el entorno para esconder el fallo.

11. Integrar explícitamente el worker de MapLibre con Vite usando la API pública setWorkerUrl y un archivo del paquete servido por el build; importar su CSS. Verificar ruta, MIME y CSP de ese worker en el dominio revisable. Conservar sites() del starter y no editar un wrangler.jsonc inexistente ni usar propiedades internas como map.transform. Fijar la versión exacta tras esta prueba; v6.13.0 es una candidata verificada en la revisión, no una instalación ya realizada.
12. Comprobar antes de cerrar la elección del motor y del proveedor que pueden representar muestras de las escrituras de los veinte idiomas, incluidos árabe, devanagari, bengalí, telugu y shahmukhi. Documentar si se usan glifos remotos o fuentes mediante font-faces y sus licencias, carga y compatibilidad. Esta prueba de capacidad no sustituye las traducciones y revisión de 2B/2C.

#### Criterios de aceptación del bloque 1A

- La aplicación compila y su versión revisable carga el globo vectorial, las calles y las rutas de servidor; proveedor, versión fijada, licencia, cobertura y modalidad de credenciales están documentados sin incluir valores secretos.
- La transición globo a vista local conserva centro y ubicación; las pruebas reproducibles de escala, proyección, latitudes y rendimiento cumplen el bloque, sin sustituir detalle por ampliación de imagen.
- El build publicado carga su motor, glifos y workers sin errores de origen o de inicialización en servidor. Las rutas de servidor de referencia responden; la integración y aceptación del buscador se completan en 1B, sin condicionar 1A a ese bloque futuro.
- El worker y CSS del motor se incluyen correctamente en el build de Vite/Sites; no hay dependencia de rutas del servidor de desarrollo ni de una importación en servidor.
- La selección de motor, estilo y fuentes pasa muestras de composición de las escrituras requeridas; no se traslada al sprint 2 una incompatibilidad conocida que obligue a reemplazar el mapa.

### Bloque 1B Pantalla y controles

1. Eliminar completamente el encabezado actual: barra, navegación, subtítulo, indicador de entorno, versión y línea divisoria. Retirar también mensajes promocionales y títulos decorativos superpuestos al mapa.
2. Mantener solamente el icono y el nombre provisional flotando sobre el globo. La marca no reserva una franja de pantalla ni intercepta gestos fuera de su área real.
3. Hacer que el mapa ocupe todo el espacio visible, con adaptación al tamaño de la ventana del navegador. Al acercar, el globo puede extenderse más allá de los bordes de la pantalla.
4. Disponer controles flotantes para acercar, alejar, recuperar la vista global, buscar un lugar y abrir escenarios. Agrupar idioma, información y disclaimer en un menú accesible; no reconstruir una barra superior.
5. Incorporar búsqueda exclusivamente de países y ciudades. Las sugerencias indican su tipo y ubicación administrativa para distinguir nombres repetidos. No buscar ni ofrecer calles, direcciones, edificios, barrios, negocios u otros puntos de interés. El campo se identifica como «País o ciudad» y no ofrece búsqueda detallada alternativa. Mantener la búsqueda cerrada hasta que se solicite.
6. Permitir selección de ubicación con clic y movimiento posterior del punto. Diferenciar arrastrar el mapa de seleccionar: soltar un arrastre no debe crear un punto.
7. Conservar controles por teclado y proporcionar una alternativa accesible al gesto de colocar un punto. No capturar teclas de navegación cuando el foco está en un campo de texto.
8. Retirar rotación automática inicial, coordenadas permanentes y leyendas decorativas. Las coordenadas aparecen solamente al consultar o editar una ubicación; la escala aparece cuando ayuda a entender la distancia.
9. Mantener la atribución cartográfica exigida por el proveedor en una posición discreta y legible. No ocultarla para cumplir el minimalismo.
10. Mantener una sola ubicación seleccionada y diferenciar centro de cámara de punto elegido. No crear el punto inicial del prototipo ni iniciar un resultado automáticamente. Ajustar encuadre al abrir un panel sin cambiar la ubicación y sin permitir que quede oculta tras la tarjeta.
11. Detectar WebGL2 no disponible o pérdida de contexto. Permitir reintento y conservar búsqueda y fichas accesibles; no sustituir el mapa por una pantalla vacía ni presentar una vista textual como un globo funcional.

12. Completar el adaptador servidor del buscador con esquema validado, límites de longitud y resultados, tiempo máximo, cancelación y protección de cuota. Limitar la consulta del proveedor a países y ciudades y filtrar su respuesta mediante una lista permitida de tipos; rechazar calles, direcciones, edificios, barrios, POI y tipos desconocidos también al leer la caché. No deducir el tipo por el texto del nombre ni depender únicamente del cliente. Definir comportamiento ante 429 y fallos del proveedor, sin reintentos ilimitados. Cachear únicamente respuestas permitidas por licencia, idioma y audiencia; las restricciones deben seguir funcionando en la versión revisable.
13. Fijar una matriz de navegadores web para las comprobaciones: Chromium y Firefox, registrando versiones y dimensiones de la ventana. Probar tamaño de texto al 200 %, ancho de 320 píxeles CSS, paneles desplazables, teclado y controles accesibles sin superposición. Las comprobaciones registran navegador, versión, tamaño de ventana y resultados; no requieren plataformas adicionales.

#### Criterios de aceptación del bloque 1B

- En ventanas estrechas y amplias, nombre e icono flotan sin reservar una cabecera; controles de zoom, búsqueda, selección y regreso global funcionan con ratón y teclado.
- El usuario alcanza escala de 5 metros, ve nombres de calles y recupera la vista global sin recargar.
- La marca flota y el globo puede llenar toda la pantalla al acercar.
- Las búsquedas solo ofrecen países y ciudades identificados como tales. Consultas de calles, direcciones, edificios, barrios y POI no devuelven esos objetos; respuestas de tipo desconocido se descartan. No hay comercios ni sus etiquetas en las capas; las calles con nombre permanecen en el mapa.
- Una búsqueda ambigua permite elegir la ciudad correcta. Cero resultados y fallo del servicio tienen una recuperación comprensible.
- Con teclado se puede recorrer y cerrar controles sin quedar atrapado. El mapa puede seguir utilizándose si un servicio auxiliar falla.
- Pasan las medidas de zoom y presupuesto del bloque 1A; la ausencia de GPU tiene recuperación y lectura alternativa.
- El buscador integrado pasa búsqueda de país, ciudad ambigua, ausencia de resultados, respuesta fuera de orden, entrada inválida, cuota y recuperación en el dominio revisable. El servidor excluye calles, direcciones, barrios, edificios, POI y tipos desconocidos, incluso en respuestas mixtas y caché. Sus límites, mapeo de tipos del proveedor y política de caché están documentados.
- La matriz de navegadores web tiene evidencias realmente ejecutadas; cualquier falta de acceso a un entorno queda pendiente y no se convierte en una prueba aprobada. Cambiar un objetivo de rendimiento requiere aceptación explícita del usuario.

### Bloque 1C Paneles bajo demanda

1. Crear una gestión explícita de estados: exploración, búsqueda, configuración, ejecución, resultado y consulta de información. El estado inicial es exploración, sin tarjetas de resultados vacías.
2. Abrir configuración al solicitar escenarios; cerrarla conserva la selección. El botón de ejecución vive en ese flujo y no necesita una tarjeta de resultados anticipada.
3. Mostrar resultados solamente después de una operación terminada. Invalidar lo que dependa de una ubicación o configuración modificadas mediante una firma de entradas. Un registro histórico fijo no cambia cuando se mueve la cámara o el punto libre; una consulta demográfica sí depende de su área. No borrar resultados al cambiar solo el idioma.
4. En ventanas estrechas, utilizar un panel inferior con cierre y altura limitada. Mantener visible parte del mapa y permitir desplazamiento dentro del contenido sin mover accidentalmente el globo.
5. En ventanas amplias, usar un panel superpuesto que pueda cerrarse. Al solicitar otro panel, sustituir el anterior cuando su coexistencia no tenga utilidad.
6. Aplicar Escape para cerrar, restauración del foco y tratamiento correcto de paneles modales. Un panel cerrado no conserva controles invisibles en el recorrido del teclado.
7. Reubicar los textos extensos de alcance y metodología en el disclaimer accesible desde el menú. Suprimir subtítulos como «Cada evento cuenta una historia» y estados permanentes como «En espera».
8. Retirar en este sprint la función fictionalOutcome, el selector de población ficticia, los multiplicadores de preparación, las cifras de juego y sus animaciones de impacto. Mantener las fichas de contexto existentes que sean utilizables y sus fuentes como recorrido de consulta completo. No dejar esta limpieza esperando al sprint 4 ni conservar resultados ficticios ocultando sus etiquetas.
9. Preparar el registro común de entradas y capacidades con las categorías «Accidente», «Militar» y «Natural». La interfaz muestra únicamente categorías con contenido terminado. Esta estructura debe permitir agregar cada catálogo posterior sin requerir código de otro catálogo todavía pendiente.
10. Entregar el renderizador común de fichas, fuentes, detalles y capas junto a los casos de contexto existentes. Validar sus datos y gestionar montaje, cierre y limpieza sin depender de un catálogo posterior. Los sprints 4 a 7 incorporan casos a esta función terminada.
11. Definir regreso al mapa, cancelación y sustitución de paneles, con historial de navegación cuando sea necesario para que el botón Atrás cierre la vista esperada. No añadir funciones de compartir ni publicar escenarios.

#### Criterios de aceptación del bloque 1C

- Los paneles solo aparecen al solicitarlos; Escape, Atrás cuando corresponda, cierre y restauración del foco funcionan sin controles invisibles en el recorrido del teclado.
- Se retiraron fictionalOutcome, población ficticia, multiplicadores de preparación, cifras arbitrarias y sus animaciones; las fichas utilizables siguen accesibles con fuentes.
- El registro de capacidades y el renderizador de fichas funcionan con el contenido disponible; cambio de consulta, respuesta obsoleta y cierre limpian los datos y capas dependientes.
- Al abrir en 390 × 844 y 1440 × 900, el mapa ocupa el área visible y ninguna tarjeta de resultados está abierta.
- Abrir, ejecutar y cerrar conserva la ubicación y el acercamiento; arrastrar no crea puntos.

### Entregables y aceptación

Entregar aplicación con servidor y build funcional, mapa, estilo sin satélite ni puntos de interés, búsqueda, paneles, fichas comunes, disclaimer y configuración documentada de servicios. Los resultados arbitrarios del prototipo quedan retirados.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: entregar la experiencia cartográfica completa. No resolver el zoom estirando el dibujo actual ni dejar la búsqueda o las calles para otro sprint.

## Sprint 2 Idiomas y nombres geográficos

### Objetivo y condición de entrada

El usuario puede usar todas las funciones disponibles y leer los nombres de países en cualquiera de los veinte idiomas acordados. El mapa del sprint 1 debe estar terminado y ofrecer control de sus etiquetas.

### Bloque 2A Registro de idiomas y selección

| Idioma | Identificador propuesto | Nombre en el selector | Dirección |
| --- | --- | --- | --- |
| Español | es | Español | Izquierda a derecha |
| Inglés | en | English | Izquierda a derecha |
| Chino mandarín con escritura simplificada | zh-Hans | 简体中文 | Izquierda a derecha |
| Hindi | hi | हिन्दी | Izquierda a derecha |
| Árabe estándar moderno | ar | العربية | Derecha a izquierda |
| Francés | fr | Français | Izquierda a derecha |
| Bengalí | bn | বাংলা | Izquierda a derecha |
| Portugués | pt | Português | Izquierda a derecha |
| Ruso | ru | Русский | Izquierda a derecha |
| Indonesio | id | Bahasa Indonesia | Izquierda a derecha |
| Urdu | ur | اردو | Derecha a izquierda |
| Alemán | de | Deutsch | Izquierda a derecha |
| Japonés | ja | 日本語 | Izquierda a derecha |
| Maratí | mr | मराठी | Izquierda a derecha |
| Vietnamita | vi | Tiếng Việt | Izquierda a derecha |
| Telugu | te | తెలుగు | Izquierda a derecha |
| Suajili | sw | Kiswahili | Izquierda a derecha |
| Hausa con escritura latina | ha-Latn | Hausa | Izquierda a derecha |
| Turco | tr | Türkçe | Izquierda a derecha |
| Punyabí occidental con escritura shahmukhi | pnb-Arab | پنجابی | Derecha a izquierda |

Los identificadores y escrituras son decisiones técnicas propuestas para implementar las variedades seleccionadas. Validarlos con los servicios, las tipografías y las traducciones reales. No reemplazar punyabí occidental por otra variedad ni ampliar chino simplificado a todas las escrituras chinas sin una decisión expresa. El catálogo determina el idioma del contenido, incluso si un navegador no incluye datos Intl para ese identificador.

1. Extraer todos los textos visibles y accesibles a catálogos de traducción: botones, errores, búsquedas, categorías, cifras, paneles, fuentes, disclaimer y metadatos del sitio.
2. Detectar inicialmente el idioma preferido del navegador. Usar la región como criterio complementario solamente cuando esté disponible y sea pertinente; no pedir localización precisa para elegir idioma.
3. Aplicar prioridad: elección manual guardada, preferencia compatible del navegador y español como alternativa predeterminada. Documentar el emparejamiento entre variantes como es-DO y es, así como variantes chinas de distinta escritura.
4. Hacer que el selector esté siempre disponible desde el menú flotante. Utilizar nombres nativos, permitir búsqueda y no representar idiomas mediante banderas.
5. Recordar la elección manual en el navegador. Si el almacenamiento está bloqueado, mantener el idioma durante la sesión sin interrumpir al usuario.
6. Cambiar inmediatamente la interfaz sin recargar, perder ubicación, cerrar un resultado vigente ni reiniciar la configuración.

#### Criterios de aceptación del bloque 2A

- El selector contiene los veinte idiomas con nombres nativos, búsqueda y prioridad documentada: elección manual, navegador compatible y español como alternativa.
- La detección no pide ubicación precisa; la elección manual cambia el estado de idioma sin perder punto, zoom o configuración y se conserva durante la sesión aunque el almacenamiento esté bloqueado.
- Las claves de todos los textos existentes están extraídas y el selector está conectado a catálogos locales; el cambio de idioma no necesita un servicio de traducción por renderizado.
- Al regresar, se conserva la elección manual aunque el navegador prefiera otro idioma.

### Bloque 2B Traducción y composición

1. Completar y revisar las traducciones de todo el producto existente. No concatenar fragmentos que impidan concordancia; permitir traducciones de frases y plurales completos.
2. Formatear cantidades, fechas y unidades según el idioma. Mantener el significado de cada cifra aunque cambie su representación; evitar separadores decimales o fechas ambiguas.
3. Configurar lang y dirección de lectura en el documento. Adaptar paneles y controles al árabe, urdu y punyabí occidental. El mapa conserva el significado geográfico: no se refleja como una imagen.
4. Utilizar fuentes que cubran todas las escrituras. Probar cifras mezcladas con texto de derecha a izquierda, coordenadas y enlaces para evitar reordenamientos incorrectos.
5. Probar textos largos, caracteres compuestos y tamaños de letra ampliados. Los botones no deben recortar su acción ni depender de una traducción artificialmente corta.
6. No consultar un servicio de traducción cada vez que se pinta un control. Entregar catálogos versionados, revisables y disponibles aunque el servicio externo falle.
7. Verificar supportedLocalesOf para cantidades, fechas y plurales en los navegadores objetivo. Si un identificador como pnb-Arab no está soportado, fijar formatos alternativos revisados o incorporar los datos de formato necesarios. No cambiar la traducción a otro idioma ni dejar que una alternativa silenciosa altere unidades o fechas.
8. Probar glifos y composición de etiquetas dentro del mapa, no solo fuentes CSS de los paneles. MapLibre documenta composición bidireccional y árabe incorporada en versiones actuales; verificar la versión fijada y las escrituras índicas. No instalar automáticamente un plugin RTL obsoleto. [Composición RTL de MapLibre](https://maplibre.org/maplibre-gl-js/docs/API/functions/setRTLTextPlugin/).
9. Mantener una caché de búsqueda que incluya idioma y política de nombres. Un resultado de búsqueda español no reemplaza una respuesta pendiente en árabe. Configurar mezcla de coordenadas, cifras y enlaces con aislamiento bidireccional.

#### Criterios de aceptación del bloque 2B

- Cantidades, fechas y plurales pasan casos de referencia; cualquier alternativa de Intl está documentada y no cambia idioma, unidades ni significado. Texto ampliado y traducciones largas no recortan acciones.
- No hay claves de traducción expuestas, texto sin traducir accidentalmente ni caracteres ausentes.
- La auditoría detecta claves faltantes antes de publicar. Cada idioma tiene una revisión lingüística identificada; un borrador automático no se declara revisado.
- Los idiomas de derecha a izquierda funcionan en ventanas estrechas y amplias, con coordenadas y números legibles.

### Bloque 2C Países en el idioma elegido

1. Relacionar cada país con un identificador estable y su nombre en los veinte idiomas. Mantener nombres visibles separados de los identificadores internos.
2. Aplicar el idioma a las etiquetas del mapa, resultados de búsqueda y descripciones de ubicación. Actualizar etiquetas sin regenerar datos geográficos ni borrar la selección.
3. Si el proveedor no incluye una lengua, completar la localización mediante el estilo o un catálogo propio compatible con sus condiciones. Resolver esa ausencia dentro del sprint.
4. Definir una alternativa controlada para una traducción excepcionalmente ausente: nombre local o inglés, con explicación disponible al consultar la ubicación. No cubrir silenciosamente un catálogo incompleto con inglés.
5. Mantener calles en su nombre oficial disponible. La traducción de todos los nombres de calles no fue solicitada; evitar inventar nombres o transliteraciones sin fundamento.
6. No sumar hablantes para afirmar cobertura mundial única. El multilingüismo produce solapamiento; el alcance comercial de los idiomas no forma parte de las métricas visibles del mapa.
7. Si las teselas no contienen los veinte nombres, añadir una capa propia de nombres de países con anclajes y códigos estables, suprimiendo la etiqueta duplicada del proveedor. Traducir el mismo conjunto de entidades, sin alterar su clasificación al cambiar de idioma; manejar territorios sin código ordinario mediante identificadores propios documentados.

8. Normalizar countryId y countryCode del proveedor y traducir el componente país de cada sugerencia con el catálogo propio; conservar ciudades según sus nombres publicados. Entregar búsqueda de nombres y alias de países en los veinte idiomas sobre ese catálogo si el proveedor no reconoce una lengua. Mantener únicamente países y ciudades en todos los idiomas, sin ampliar los tipos a calles, direcciones o POI. No sustituir toda la descripción administrativa con una traducción inventada ni depender de que el proveedor acepte pnb-Arab.

#### Criterios de aceptación del bloque 2C

- Cada país tiene identificador estable y nombre revisado en los veinte idiomas; al cambiar idioma no aparecen etiquetas duplicadas ni se alteran coordenadas o resultados.
- Los glifos y la composición se comprueban dentro del mapa en las veinte escrituras, con una alternativa de nombres explícita donde el proveedor no tenga traducción.
- Cambiar entre los veinte idiomas actualiza país, controles, disclaimer y resultados existentes, manteniendo el punto y el zoom.
- Las etiquetas del mapa pasan revisión de composición y glifos en las veinte escrituras. La ausencia de datos Intl no cambia el idioma del contenido.
- Se puede buscar un país con su nombre en cada idioma aunque el proveedor no soporte ese locale; sugerencia, etiqueta y ficha comparten identificador y nombre de país sin alterar los nombres oficiales de calles.

### Entregables y aceptación

Entregar veinte catálogos completos, selector persistente, formatos locales, composición de derecha a izquierda y nombres de países localizados.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: localizar la experiencia completa y sus nombres de países. «Veinte opciones en un selector» no constituye una entrega si los textos o etiquetas siguen en español.

## Sprint 3 Población y consulta territorial

### Objetivo y condición de entrada

El usuario puede consultar población real publicada para países, ciudades y áreas que seleccione. Deben estar terminados el mapa, los paneles y los veinte idiomas. Este bloque entrega consulta demográfica útil por sí misma, sin esperar al catálogo de escenarios.

### Bloque 3A Fuentes y servicio de consulta

1. Evaluar censos oficiales y conjuntos de población distribuida espacialmente. WorldPop es una fuente candidata de datos demográficos geográficos, no un proveedor ya contratado ni una garantía de exactitud para cada calle. Revisar conjunto, año, licencia y metodología antes de integrarlo. [WorldPop](https://www.worldpop.org/).
2. Definir una política de selección por país y año. Distinguir recuento censal, proyección demográfica y distribución modelada. No combinar fuentes de distinta fecha sin documentar el procedimiento.
3. Registrar cobertura por país, resolución espacial, fecha de referencia, versión, licencia y procedencia. Una resolución de población de cientos de metros no mejora por acercar el mapa a 5 metros.
4. Implementar la ingesta y consulta de la arquitectura: edición fijada, archivos de referencia comprobados, bloques y agregados preparados fuera del Worker, manifiesto y acceso por servidor. Probar el presupuesto de memoria y CPU con datos reales; elegir un GIS externo configurado dentro de este bloque si el procesamiento acotado no lo cumple.
5. Implementar consultas geográficas con validación de coordenadas y geometrías, límites de tamaño, caché por fuente y año, tiempos de espera y cancelación.
6. Diferenciar dato disponible, cobertura parcial, sin cobertura y consulta fallida. No convertir ausencia de datos en cero habitantes.
7. Seleccionar un proveedor de límites administrativos con licencia y edición, aparte del geocodificador. Una sugerencia con coordenadas no incluye necesariamente el polígono de una ciudad. Relacionar límites y población por identificadores, sin unir únicamente por nombre traducido.
8. Usar una edición coherente del conjunto raster como base para sumas comparables. Mantener los recuentos censales oficiales como una magnitud distinta, con fecha y perímetro propios; no sustituir silenciosamente una suma modelada por un censo de otra área.
9. Registrar versión de datos, unidades, NoData y manifiesto con comprobación de integridad. Actualizar de forma atómica: activar la nueva edición solo cuando sus archivos y agregados estén completos, conservando la edición anterior para recuperación.

10. Declarar los bindings d1: DB y r2: BUCKET en .openai/hosting.json cuando se use esta ruta, con tipos del entorno y esquema Drizzle. Generar y revisar migraciones con db:generate, aplicar solo las pendientes en el entorno local y publicar mediante Sites para las alojadas. Mantener SQL y metadatos aplicados inmutables; no cargar censos en migraciones ni crear tablas al atender una consulta.
11. Definir y versionar el formato real de cada bloque consultable: CRS, transformación de coordenadas a celda, dimensiones, orden de filas, tipo numérico, endianness, unidades, escala, máscara NoData, compresión, tamaño expandido máximo y checksum. La ruta de referencia exporta bloques numéricos acotados fuera del Worker y los lee con un decodificador TypeScript comprobado; usar GeoTIFF/COG directamente solo si su lector cumple los mismos presupuestos. No suponer que R2 convierte archivos en estadísticas ni que un JSON mundial cabe en memoria.
12. Seleccionar y fijar un motor de geometrías compatible con navegador y Workers para validación, intersección y unión. polygon-clipping es candidato para operaciones planas, no una solución automática para áreas geodésicas, validación semántica ni el meridiano 180. Documentar el método de superficie y preparar en la ingesta las reproyecciones necesarias; comparar un caso real del servidor con una referencia independiente GDAL/Rasterio.
13. Definir y demostrar el canal de carga real de archivos y agregados al almacenamiento alojado: autorización exclusiva del operador, lotes acotados, reanudación idempotente, integridad y activación del manifiesto tras finalizar. Las bases y buckets locales son distintos de los alojados. Si Sites no ofrece el canal o permisos necesarios, configurar la ruta GIS externa antes de seguir; no asumir credenciales o herramientas administrativas que no se tienen.

#### Criterios de aceptación del bloque 3A

- Fuente, edición, unidades, NoData, cobertura, licencia y límites administrativos están registrados en un manifiesto; el geocodificador no se utiliza como proveedor implícito de perímetros.
- La ingesta fuera del Worker y la consulta de referencia funcionan con datos reales y límites medidos; si se elige GIS externo, está configurado y comprobado, no pendiente de contratación.
- Catálogo, archivos por bloques y agregados administrativos tienen versiones compatibles y recuperación documentada; una API de metadatos no se declara servicio de suma por polígonos.
- La cobertura del conjunto se registra para todos los países; las ausencias son visibles y no se inventan valores para afirmar cobertura global.
- Bindings, esquema y migraciones locales/alojadas están comprobados con un conjunto pequeño real; la carga de datos está separada del SQL de estructura.
- El decodificador del servidor reproduce valores y NoData de bloques preparados por la ingesta, rechaza corrupción o formatos incompatibles y respeta límites de lectura y memoria expandida.
- El motor geométrico fijado demuestra unión e intersección correctas y superficie coherente; su compatibilidad con el build de Workers se verificó, no solo con Node.
- Existe un recorrido demostrado de preparación, carga alojada, comprobación y activación atómica, o un GIS externo configurado y equivalente. Sin esta evidencia no se inicia 3B.

### Bloque 3B Área y cálculo

1. Permitir seleccionar una unidad administrativa y consultar su población. Definir «ciudad» usando un límite concreto: municipio, área urbana u otra unidad publicada; mostrar cuál se usa.
2. Añadir una herramienta de área demográfica, mediante dibujo de un polígono o selección de un límite disponible. No se trata de un radio de daño ni de la huella de un arma.
3. Permitir modificar y borrar el área. Cancelar un dibujo incompleto no crea una consulta ni una cifra aparentemente definitiva.
4. Calcular población dentro del área respetando las unidades de la fuente. Si los datos representan densidad, convertirla con áreas correctas; si representan personas por celda, no multiplicar otra vez por superficie.
5. Documentar cómo se tratan las celdas que intersectan parcialmente el límite, el agua, los valores ausentes y los cambios de proyección. Si se supone distribución uniforme dentro de una celda, conservar esa suposición en metodología.
6. Manejar áreas que atraviesan fronteras o el meridiano 180 sin sumar dos veces ni recortar datos silenciosamente.
7. Evitar falsa precisión en áreas menores que las celdas de origen. Mostrar resolución y estimación cuando correspondan; no generar población calle por calle a partir de un dato regional.
8. Para un punto, solicitar una unidad administrativa o un área; no mostrar «población de una coordenada» sin explicar su celda o perímetro. Distinguir geometría seleccionada de encuadre del mapa.
9. Validar polígonos y multipolígonos, anillos cerrados, huecos, autointersecciones, coordenadas finitas y geometrías vacías en cliente y servidor. Mantener el área original al informar un error; no corregir automáticamente una geometría alterando su significado.
10. Normalizar cruce del meridiano 180, repetición de mundo y límites compartidos antes de consultar. La suma usa una unión sin duplicados y una política de superficie adecuada al sistema de referencia; no mide grados cuadrados como metros cuadrados.
11. Fijar mediante benchmark límite de vértices, tamaño del cuerpo, área y bloques consultables. Los países y unidades grandes utilizan agregados preparados. Cuando un dibujo exceda el límite, ofrecer simplificación con su efecto explicado o selección administrativa; no bloquear la interfaz durante un cálculo sin límite.
12. No redondear cada celda antes de sumar ni recortar un valor negativo de NoData a cero sin interpretar su metadato. Conservar precisión interna y redondear solo la presentación. La proporción de área con datos válidos no representa automáticamente proporción de población cubierta.

13. Separar explícitamente modo de exploración, selección y dibujo de Terra Draw: los gestos no deben crear a la vez un punto y un vértice, ni el doble clic de finalizar un dibujo ejecutar el zoom del mapa. Conservar geometría original para cálculo; una simplificación destinada solo a visualizar una capa no reemplaza silenciosamente el área consultada. Probar cancelación, edición y repetición de mundo con las bibliotecas fijadas.

#### Criterios de aceptación del bloque 3B

- Validación de geometrías, huecos, multipolígonos, unión de áreas, NoData y celdas parciales evita dobles recuentos; método y precisión interna se comprueban con referencias independientes.
- Un polígono de referencia reproduce una suma independiente sobre el mismo conjunto dentro de la tolerancia documentada.
- Las pruebas cubren borde de celda, área pequeña, agua, ausencia de datos, frontera y meridiano 180.
- La consulta de referencia especifica método y tolerancia antes de medir. Un cálculo determinista sobre las mismas celdas debe reproducirse; una integración parcial con aproximación compara contra una referencia geográfica independiente y comunica su tolerancia numérica, distinta de incertidumbre demográfica.
- Se verifica cuota, límite de tamaño, cancelación y memoria en el runtime publicado. Un polígono excesivo ofrece una acción alternativa y no agota el servidor.
- Los gestos de dibujo y mapa no compiten; la consulta identifica la geometría original y cualquier simplificación aceptada. La superficie se calcula con el método acordado, no sobre un polígono simplificado solo para mostrarlo.

### Bloque 3C Presentación de resultados

1. Abrir la tarjeta demográfica solamente cuando el usuario consulte una ubicación o un área. Mostrar área, población, año y tipo de dato, con acceso breve a la fuente.
2. Mantener unidad y definición junto a la cifra. Colocar metodología, licencia y detalles en una vista desplegable solicitada por el usuario.
3. Representar la cobertura parcial sin fingir que el total observado cubre todo el polígono. No permitir comparar dos cifras como equivalentes si sus límites o fechas difieren sin explicación.
4. Impedir que una respuesta lenta de una selección anterior sustituya el resultado de la ubicación actual. Relacionar cada respuesta con el área y la versión solicitadas.
5. Permitir reintentar sin perder el área ni el idioma. No mostrar una cifra anterior como actual durante el fallo.
6. Mantener separados fecha de consulta, año poblacional y fecha de la geometría histórica. Una población actual dentro de un área de un evento pasado no es la población que vivía allí al ocurrir el evento.
7. Cachear por geometría normalizada, edición, fuente, unidades y método, incluyendo precisión del área. No usar solo el nombre de la ciudad ni el idioma como identidad de la cifra.

8. Validar también las respuestas del servicio: esquema, números finitos y no negativos, unidades, versiones, cobertura y geometría consultada. Diferenciar respuesta JSON válida de HTML inesperado o de un error del proveedor; ofrecer reintento sin borrar el área ni pedir iniciar sesión. No pintar NaN, infinito, un total mal formado o un agregado de otro perímetro. La consulta se prueba anónimamente.

#### Criterios de aceptación del bloque 3C

- Los resultados y errores están localizados en los veinte idiomas, aparecen bajo demanda y ofrecen recuperación; sin cobertura, fallo y población cero son estados distintos.
- Una ciudad y un país muestran su límite definido, población, fuente y año.
- Modificar el área invalida el resultado anterior. Una consulta fuera de orden no modifica la selección vigente.
- La interfaz nunca etiqueta población del área como heridos, fallecidos o bajas.
- Una respuesta mal formada, incompatible o de servicio fallido no se presenta como población válida; conserva área e idioma y permite reintentar sin pedir identidad al visitante.

### Entregables y aceptación

Entregar fuentes versionadas, servicio real de consulta, selección de límites y polígonos, cálculo territorial documentado y tarjeta localizada.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: terminar una herramienta de consulta territorial real. No conectar los datos a los porcentajes ficticios del prototipo ni asumir precisión de 5 metros en la población.

## Sprint 4 Accidentes

### Objetivo y condición de entrada

El usuario puede escoger Accidente y explorar gas doméstico, gas industrial y Beirut con datos pertinentes a cada caso. La consulta territorial debe estar aceptada. La entrega incluye su propio flujo de selección, ejecución, resultado y consulta de fuentes.

### Bloque 4A Catálogo y comportamiento

1. Usar el registro y las categorías definitivas «Accidente», «Militar» y «Natural» preparados en el sprint 1. Mostrar únicamente entradas terminadas; no publicar pestañas vacías ni anunciar funciones futuras como disponibles.
2. Crear entradas estables para tanque de gas doméstico pequeño, tanque de gas industrial y Beirut. Separar nombres traducidos, identificadores, tipo de información, fuentes y capacidades de cada entrada.
3. Presentar tarjetas con nombre y una diferencia útil entre opciones. No repetir nombre, categoría y un subtítulo equivalente en tres lugares.
4. Para gas doméstico e industrial, entregar contexto de seguridad y prevención respaldado por fuentes pertinentes. Usar ubicación y población como contexto territorial; no inventar tasas de lesión ni recomendaciones operativas sobre fabricación o detonación.
5. No añadir volumen, potencia o controles técnicos solamente porque resulten visualmente atractivos. Cada campo debe tener una función implementada y válida.
6. Para Beirut, entregar un caso histórico en su ubicación original con cronología y recuentos registrados. Distinguir versiones de los recuentos y sus fechas; no trasladar sus víctimas a otra ciudad.

#### Criterios de aceptación del bloque 4A

- Gas doméstico, gas industrial y Beirut tienen entradas completas, fuentes revisadas, capacidades y textos en los veinte idiomas, utilizables en el renderizador común.
- Gas doméstico e industrial muestran información diferenciada y no el mismo resultado numérico con distinto icono.
- Beirut abre su caso original con fecha y fuente de cada recuento de víctimas.

### Bloque 4B Ejecución y resultados

1. Verificar que siguen retiradas la función fictionalOutcome y la población ficticia desde el sprint 1. No reintroducir el ajuste de «preparación» como multiplicador arbitrario de muertes.
2. Definir para cada entrada qué hace el botón principal. La etiqueta puede ser «Explorar caso» o «Consultar área» según la operación real. No llamar «Detonar» a una consulta que no calcula una detonación.
3. Si se reproduce una secuencia visual del accidente, debe corresponder al contenido del caso y no dibujar anillos arbitrarios como distancias físicas verificadas.
4. El resultado reúne solamente los datos relevantes: población consultada, contexto del lugar y, en casos históricos, cifras documentadas. Las víctimas históricas mantienen el vínculo con el evento original.
5. Un área observada del accidente puede utilizarse para consultar población dentro de ella únicamente si existe geometría publicada y procedencia. No inventar una huella para completar una tarjeta.
6. Cambiar caso o ubicación invalida lo que dependa de esa selección; consultar de nuevo actualiza el resultado. No obligar al usuario a reiniciar todo el portal.
7. Mantener fuentes y detalles a una acción del resultado. Traducir todo el flujo a veinte idiomas y conservar definiciones entre traducciones.
8. Elegir la edición poblacional de cada consulta según lo que se quiere mostrar. Si no hay datos para la fecha del accidente, etiquetar el año disponible; no reconstruir población histórica mediante una regla proporcional inventada.

#### Criterios de aceptación del bloque 4B

- La consulta territorial utiliza área y año correctos y distingue población de registros históricos; cambio de caso, error y cierre conservan navegación y limpian resultados dependientes.
- Colocar un punto en otro país no presenta víctimas de Beirut como estimación local.
- No quedan referencias ejecutables a los porcentajes de juego en el flujo renovado.
- Los paneles aparecen después de una acción y se pueden cerrar conservando la vista del mapa.
- La ausencia de una huella documentada no genera una geometría falsa ni una cifra de daño.

### Entregables y aceptación

Entregar las tres entradas, sus fuentes, flujos completos y sustitución de resultados arbitrarios.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: completar las tres experiencias de accidente. La consulta demográfica y las víctimas históricas son conceptos separados; no fabricar un modelo de bajas para aparentar una función completa.

## Sprint 5 Fenómenos naturales

### Objetivo y condición de entrada

El usuario puede explorar erupciones explosivas y otros fenómenos naturales documentados. Reutilizar mapa, localización y consulta territorial ya terminados; la función debe poder cerrarse sin esperar al sprint militar o científico.

### Bloque 5A Selección de fenómenos y casos

1. Preparar una selección inicial de al menos una erupción explosiva documentada y un segundo fenómeno explosivo natural pertinente, como una explosión hidrotermal. Confirmar fuentes antes de crear entradas visibles.
   Al menos uno de los dos casos debe disponer de una geometría documentada compatible con consulta territorial. Seleccionar los casos y obtener esa geometría antes de desarrollar su capa; no cerrar este sprint con dos fichas textuales si se prometió consulta espacial.
2. Definir cada entrada por fenómeno, evento, fecha, ubicación y datos disponibles. No presentar todos los desastres naturales como explosiones.
3. Asociar casos históricos a sus ubicaciones reales. Un usuario puede navegar a otro lugar, pero eso no mueve automáticamente un volcán ni su zona observada.
4. Diferenciar mecanismos de peligro cuando las fuentes los distingan: ceniza, flujo piroclástico, onda u otros. No reutilizar indiscriminadamente un círculo de explosión para todos.
5. Mantener informes observados separados de alertas vigentes. No anunciar seguimiento en tiempo real si la integración solo contiene datos históricos.

#### Criterios de aceptación del bloque 5A

- Se seleccionaron al menos dos casos completos: una erupción y otro fenómeno natural, con mecanismo, fecha, fuentes y contenido revisado en los veinte idiomas.
- Al menos un caso tiene una geometría publicada utilizable, con origen, fecha y compatibilidad documentados para la consulta territorial del bloque siguiente; no se ofrece aún una consulta sin implementar.
- Cada caso conserva su origen, fecha, mecanismo y fuente.

### Bloque 5B Capas y consulta

1. Mostrar capas del fenómeno únicamente cuando el usuario abra ese caso. Los marcadores específicos de un caso solicitado no son puntos de interés comerciales de la cartografía base.
2. Utilizar límites o áreas publicados con fecha y procedencia. Si faltan, entregar la consulta del caso sin inventarlos.
3. Si el área documentada permite consulta demográfica, calcular población dentro de ella usando el servicio del sprint 3. Indicar por separado la fecha del área y la del conjunto poblacional.
4. Mostrar víctimas históricas solamente como registros del evento. No aplicar tasas de víctimas a la población seleccionada.
5. Permitir encender y apagar capas pertinentes y volver a la exploración limpia. Mostrar una leyenda solo mientras sea necesaria para interpretar una capa activa.
6. Entregar ficha y resultado en veinte idiomas, con textos breves y fuentes expandibles.

#### Criterios de aceptación del bloque 5B

- Cerrar el caso limpia capas y leyendas asociadas sin cambiar idioma ni zoom.
- No aparecen anillos idénticos para fenómenos de geometrías distintas.
- Población dentro del área, víctimas registradas y actividad actual no se confunden.
- Un caso sin geometría sigue siendo consultable, pero no ofrece una consulta de exposición sobre una huella inventada.
- Al menos un caso demuestra capa documentada y consulta de población dentro de ella, con las dos fechas distinguidas.

### Entregables y aceptación

Entregar categoría Natural con al menos dos casos completos y sus capas cuando existan datos válidos.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: desarrollar casos naturales completos según sus datos reales. No dejar una tarjeta de volcán vacía ni convertir cualquier círculo en una zona de peligro.

## Sprint 6 Escenarios militares históricos

### Objetivo y condición de entrada

El usuario accede a contexto de explosiones convencionales y nucleares, consecuencias humanitarias y acontecimientos documentados. Este bloque utiliza mapa y localización terminados; no requiere un motor de armas ni los otros catálogos.

### Bloque 6A Catálogo y consulta histórica

1. Crear entradas convencionales y nucleares orientadas a antecedentes históricos y consecuencias documentadas. Entregar al menos un caso histórico convencional y uno nuclear con fuentes y ubicación original, además del contexto que aporte utilidad. Definir claramente si una entrada es un acontecimiento concreto o un tema de contexto.
2. Seleccionar fuentes primarias o institucionales adecuadas y conservar fechas, definiciones y versiones de cifras. No combinar recuentos de distintos eventos ni presentar una controversia como certeza.
3. Ubicar eventos históricos en su punto original cuando la fuente lo permita. Ofrecer navegación al caso, cronología y acceso a fuentes; no un control de traslado de armas.
4. Describir consecuencias humanas y ambientales con el alcance respaldado por las fuentes. No añadir especificaciones operativas, selección de objetivos ni comparadores de rendimiento de armas.

#### Criterios de aceptación del bloque 6A

- Existe al menos un caso convencional y uno nuclear completos en su lugar original, con fecha, indicadores definidos, fuentes revisadas y textos en los veinte idiomas.
- Los casos utilizan identificadores canónicos y son consultables con sus fichas; no dependen del módulo futuro de Tierra para presentar su contexto y registros históricos.
- Convencional y nuclear ofrecen contenido propio, fuentes y navegación útil.

### Bloque 6B Interacción y resultados

1. La acción principal abre o reproduce contenido histórico. No ejecuta un cálculo de ataque sobre el punto libre del usuario.
2. Verificar que siguen retirados los anillos de daño y recuentos ficticios desde el sprint 1. Las visualizaciones deben describir un registro o una comparación científica claramente definida.
3. Mostrar las víctimas registradas del evento con su definición y fuente cuando corresponda. No transformarlas en un resultado de la población actual de otra ciudad.
4. Separar el contrato militar del servicio de estimación territorial: no aceptar parámetros como ubicación objetivo y arma para producir bajas o huellas de daño.
5. Implementar cierre, cambio de caso, recuperación de errores y veinte traducciones dentro de este sprint.

#### Criterios de aceptación del bloque 6B

- Abrir, cambiar y cerrar casos funciona con teclado, ventanas estrechas y amplias; las capas previas se limpian y el contexto humanitario mantiene fuentes y navegación útil.
- Seleccionar una ubicación libre no devuelve bajas de un ataque ni cambia víctimas históricas.
- No existe un endpoint oculto o una operación accesible que calcule daño de armas sobre lugares reales.
- La categoría completa funciona sin esperar al módulo de Tierra y evidencia.

### Entregables y aceptación

Entregar dos familias de contenido terminadas, contexto documentado y navegación histórica.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: implementar consulta histórica y humanitaria, manteniendo el alcance definido. No reintroducir el calculador de ataques bajo el nombre de escenario.

## Sprint 7 Tierra y evidencia científica

### Objetivo y condición de entrada

El usuario puede entender las dimensiones y composición de la Tierra y consultar evidencia sobre HAARP, explosiones nucleares y sismicidad. El módulo se abre desde un control discreto y tiene utilidad independiente del catálogo militar.

### Bloque 7A Medidas y composición terrestre

1. Crear fichas de diámetro, masa, gravedad y estructura de corteza, manto y núcleo con unidades, definición y fuentes científicas.
2. Distinguir diámetro medio, ecuatorial y polar cuando se utilicen. No intercambiar gravedad estándar convencional con una medida local o un promedio planetario.
3. Convertir masa publicada en kilogramos a toneladas métricas con una operación verificable. Si se presentan masas por capa, utilizar una fuente o un modelo documentado; no repartir la masa en porcentajes inventados.
4. Mostrar primero la medida y una explicación breve de su utilidad. Las ecuaciones, precisión y referencias quedan en detalles expandibles.
5. Incorporar una representación de capas accesible y legible que no requiera animación para comprenderse. Evitar escalas que confundan espesores exagerados con dimensiones proporcionales.
6. Permitir comparar órdenes de magnitud solamente con cantidades físicamente comparables y unidades explícitas. Una relación entre energía o masa no prueba por sí sola ausencia de daño local.

La ficha de NASA distingue radios y medidas de gravedad; estas diferencias deben mantenerse al crear los contenidos. [NASA Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html).

#### Criterios de aceptación del bloque 7A

- Diámetro, masa en toneladas, gravedad y composición tienen definiciones compatibles; se distinguen valores medios, ecuatoriales, polares y referencias estándar.
- Las comparaciones conservan unidades y contexto local; el contenido revisado en los veinte idiomas es consultable sin esperar a HAARP ni al archivo de pruebas subterráneas.
- Toda medida tiene unidad, definición y referencia; las conversiones se verifican con un cálculo independiente.

### Bloque 7B HAARP y preguntas sobre la Tierra

1. Explicar función, región de la atmósfera estudiada y observaciones del programa a partir de fuentes verificables.
2. Formular preguntas concretas y responder con evidencia, alcance y límites. No diseñar el módulo para demostrar una conclusión previamente impuesta.
3. Separar lo que puede medirse, las inferencias científicas y las afirmaciones sin respaldo. No atribuir a una fuente una conclusión que no expresa.
4. Evitar reutilizar información operativa antigua como si describiera actividad actual. Fecha de una campaña y fecha de consulta no son equivalentes.
5. Presentar preguntas y respuestas en una vista solicitada, con búsquedas o filtros útiles cuando el contenido lo justifique. No ocupar permanentemente el globo con avisos.

La documentación del programa describe investigación ionosférica y aborda afirmaciones sobre control del clima. Utilizar las explicaciones pertinentes sin extenderlas a toda afirmación imaginable sobre daños terrestres. [Preguntas frecuentes de HAARP](https://haarp.gi.alaska.edu/faq).

#### Criterios de aceptación del bloque 7B

- Las fichas sobre HAARP y las preguntas científicas enlazan evidencia pertinente y distinguen observación, interpretación y afirmaciones no sustentadas; no parten de una conclusión impuesta.
- El recorrido para abrir preguntas, consultar fuentes y cerrar funciona en los veinte idiomas y con teclado; no necesita resultados del bloque de pruebas aún pendiente.
- La comparación global no afirma que el daño local sea imposible.

### Bloque 7C Pruebas subterráneas y sismicidad

1. Crear un archivo inicial de al menos tres casos de pruebas subterráneas de al menos dos países, con ubicación histórica, fecha, fuente y observaciones relevantes. Seleccionar los casos durante este bloque y completar sus fichas.
2. Distinguir señal sísmica de la explosión, terremoto desencadenado, réplicas y colapso cuando el registro permita esa distinción. No etiquetar todas las señales como el mismo fenómeno.
3. Relacionar observaciones con el evento correspondiente y mantener visibles fecha, magnitud reportada y su tipo cuando se incluyan. No convertir automáticamente magnitudes en potencia de un arma.
4. Permitir seleccionar un registro en una lista o en una capa solicitada del mapa y consultar su ficha. Cerrar la vista retira sus marcadores adicionales.
5. Explicar límites de la inferencia: el hecho de que una prueba no desencadenara un terremoto no demuestra que ninguna explosión pueda hacerlo.
6. No ofrecer instrucciones de ubicación, profundidad o parámetros para provocar efectos geológicos. El archivo describe observaciones históricas.
7. Traducir y revisar las fichas y explicaciones en los veinte idiomas. Conservar citas y unidades aunque cambie la presentación.
8. Registrar los eventos con identificador canónico y fuentes en el repositorio común del sprint 1. Una prueba citada también en Militar conserva una sola versión de hechos y cifras; el módulo científico presenta su contenido sin esperar una ficha militar que aún no exista.

USGS indica que algunas explosiones pueden desencadenar terremotos y que otras no lo hicieron. El contenido no debe afirmar una imposibilidad absoluta basada solo en la masa terrestre. [USGS sobre explosiones y terremotos](https://www.usgs.gov/faqs/can-nuclear-explosions-cause-earthquakes). CTBTO ofrece un registro del evento norcoreano de septiembre de 2017 que puede servir para una ficha, conservando la distinción entre observación e interpretación. [CTBTO sobre el evento de 2017](https://www.ctbto.org/our-work/detecting-nuclear-tests/2017-dprk-nuclear-test).

9. Entregar la búsqueda local de registros que exige la aceptación: filtrar los casos por nombre, país o fecha con términos localizados, sin consultar un servicio nuevo. Resolver lista vacía y limpiar el filtro al salir según el comportamiento documentado.

#### Criterios de aceptación del bloque 7C

- El archivo contiene al menos tres pruebas subterráneas de dos países, con fecha, ubicación, fuente y sismicidad documentada; no mezcla energía liberada con magnitud sísmica.
- Los acontecimientos compartidos con Militar conservan el mismo identificador y hechos; no hay fichas duplicadas con cifras o versiones contradictorias.
- Cada ficha histórica distingue registro, interpretación y fecha sin mezclar acontecimientos.
- Se pueden abrir, buscar y cerrar contenidos sin dejar marcadores o paneles sobrantes.
- Las afirmaciones científicas mantienen el mismo significado en los veinte idiomas.

### Entregables y aceptación

Entregar fichas terrestres, visualización de estructura, preguntas documentadas y archivo subterráneo navegable.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: desarrollar un módulo de evidencia verificable. No construir una demostración con una conclusión elegida de antemano ni derivar instrucciones operativas de los registros históricos.

## Sprint 8 Nombre e identidad del portal

### Objetivo y condición de entrada

Definir y aplicar un nombre atractivo que contenga al menos una palabra con significado compartido en la mayor cantidad posible de idiomas del portal, con una identidad mínima. Priorizar una sola marca internacional; proponer variantes en español e inglés únicamente si aportan claridad. ATLAS permanece como identificador provisional hasta resolver la elección. Esta decisión no bloquea mapa, datos ni contenido.

### Bloque 8A Decisión de nombre

1. Preparar al menos cinco opciones con pronunciación, significado, legibilidad en tamaño pequeño y correspondencia entre español e inglés. Usar DELTA, ATLAS, COSMOS, PLASMA y OMEGA como candidatas iniciales de la conversación, sin tratar ninguna como seleccionada.
2. Evaluar significado compartido, escritura, comprensión y asociaciones en los veinte idiomas. Documentar los idiomas efectivamente comprobados y distinguir significado técnico de reconocimiento por sus hablantes; no prometer cobertura lingüística universal. Evitar nombres que prometan precisión predictiva que el producto no tiene o que sugieran herramientas de ataque.
3. Comprobar coincidencias evidentes en la web y disponibilidad de las direcciones necesarias. Esta revisión no constituye una autorización jurídica ni una búsqueda exhaustiva de marcas.
4. Presentar una recomendación y alternativas con razones concretas. El usuario elige el nombre antes de aplicar un cambio definitivo de identidad o dirección.
5. Resolver esta decisión dentro del bloque. Si falta la elección, el bloque queda abierto por esa decisión explícita; no se declara terminado ni se traslada la adopción a un sprint futuro.
6. El bloque entra con criterios de nombre, no con un nombre ya elegido. Completar propuestas y presentar la elección concreta antes de iniciar 8B. Mientras se espera esa decisión, solo pueden revisarse funciones ya entregadas y documentación independiente; no iniciar 8B ni sprints posteriores. La selección pendiente no se toma como aprobación por transcurso de tiempo.

#### Criterios de aceptación del bloque 8A

- Se presentaron al menos cinco propuestas con significado, pronunciación y legibilidad; se distingue significado técnico compartido de reconocimiento general por sus hablantes.
- Los idiomas efectivamente comprobados, escrituras, asociaciones y coincidencias web están registrados sin prometer significado universal ni disponibilidad jurídica no verificada.
- El usuario eligió explícitamente el nombre y las variantes o regla internacional; su mensaje está registrado. Sin elección, el bloque permanece abierto y no se inicia 8B.
- Las direcciones necesarias y el alcance de cualquier cambio de slug o dominio están comprobados antes de aplicar identidad; se conserva el proyecto y su audiencia.

### Bloque 8B Aplicación completa

1. Configurar nombre principal, variantes aprobadas y reglas de selección. Los veinte idiomas no implican veinte marcas diferentes.
2. Crear o adaptar el icono vectorial, favicon y marca flotante. Mantener fondo azul #003876 y componentes blancos.
3. Aplicar identidad a título del navegador, metadatos, disclaimer, vistas informativas, documentación y todos los catálogos de traducción.
4. Evitar un subtítulo permanente o una nueva cabecera. La marca no reduce el espacio del mapa ni añade mensajes publicitarios.
5. Conservar el proyecto Sites. Cambiar slug o dominio solamente si forma parte de la identidad aprobada y después de revisar el comportamiento de la dirección anterior; no asumir redirecciones automáticas.

#### Criterios de aceptación del bloque 8B

- El nombre aprobado aparece coherentemente en todas las superficies correspondientes.
- Español e inglés utilizan las variantes acordadas; el resto de los idiomas sigue una regla documentada.
- No quedan referencias visibles accidentales al nombre provisional.
- La identidad no añade una barra, es legible en ventanas estrechas y conserva el acceso a los controles.
- La audiencia y el identificador del sitio no cambian por el trabajo de marca.

### Entregables y aceptación

Entregar decisión registrada, archivos de identidad y aplicación consistente.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: preparar la decisión en 8A y terminar su aplicación en 8B, dentro del mismo sprint. No elegir silenciosamente un nuevo nombre ni publicar variantes que el usuario no haya seleccionado.

## Sprint 9 Materiales y relación entre masa y energía

### Objetivo y condición de entrada

El usuario puede explorar materiales desde el gas propano hasta el uranio y entender por qué sus procesos de liberación de energía son distintos. La sección explica relación entre masa y energía, participación del material en la reacción y reparto de la energía liberada. Se abre bajo demanda y no añade tarjetas permanentes al globo.

Este bloque requiere paneles y veinte idiomas terminados. No requiere un calculador de armas ni depende del archivo histórico del sprint 7: sus fichas, fuentes y visualizaciones se completan aquí.

### Bloque 9A Catálogo de materiales y procesos

1. Crear un catálogo inicial que incluya propano y uranio. Como selección inicial de materiales intermedios, preparar butano, metano, etanol e hidrógeno; validar las referencias de cada ficha antes de publicarla. No tratar esta selección como una clasificación de explosivos más eficaces.
2. Identificar la sustancia, su estado de referencia y el proceso descrito. Diferenciar propano puro de GLP comercial, metano de gas natural y un elemento de sus isótopos cuando esa distinción afecte al contenido.
3. Para combustibles, explicar la liberación de energía química y la permanencia de productos de reacción. No describir combustión completa como desaparición de toda la materia.
4. Para uranio, explicar fisión y productos nucleares a nivel conceptual. La energía descrita pertenece a un proceso nuclear especificado en la fuente; no es una propiedad explosiva incondicional de cualquier muestra de uranio. No incorporar cantidades críticas, configuraciones, enriquecimiento ni parámetros de dispositivos.
5. Distinguir combustible, material radiactivo y proceso explosivo. Un material con energía disponible no produce necesariamente una explosión; combustión, expansión de gas y reacción nuclear tampoco son mecanismos intercambiables.
6. Cada ficha muestra nombre, proceso, origen de la energía y formas en que puede liberarse. Los detalles científicos, condiciones de referencia y fuentes se abren por una acción del usuario.
7. Describir cualitativamente calor, expansión, onda de presión o radiación cuando corresponda al proceso documentado. No atribuir una distribución universal de esos efectos a cada sustancia.

Como referencias de contenido inicial, EIA explica el propano como combustible y DOE describe fisión como división de núcleos con liberación de energía y productos resultantes. Estas páginas orientan la explicación, pero no sustituyen fuentes cuantitativas para una tabla de propiedades. [EIA sobre propano](https://www.eia.gov/kids/energy-sources/propane/), [DOE sobre fisión](https://www.energy.gov/science/doe-explainsnuclear-fission).

8. Completar las seis fichas iniciales: propano, uranio, butano, metano, etanol e hidrógeno. Registrar propiedad, condiciones, fuente cuantitativa y revisión científica cuando se muestre un valor; en una ficha sin cuantificación sustentada usar contenido cualitativo completo y excluirla de esa comparación. Las seis son consultables en veinte idiomas, sin reservar materiales intermedios para un catálogo futuro.

#### Criterios de aceptación del bloque 9A

- Las fichas del catálogo tienen estado y composición de referencia, proceso, propiedad energética, unidad, condiciones y fuente revisada; son consultables en los veinte idiomas sin esperar a los gráficos.
- Propano y uranio tienen fichas completas que distinguen procesos químicos y nucleares sin atribuirles el mismo mecanismo explosivo.
- Poder calorífico superior e inferior, energía y potencia, combustible y sistema completo no se confunden.
- Las seis fichas iniciales están completas y revisadas; la comparación incluye solo valores de bases compatibles. La ausencia de un porcentaje de reparto fiable no se reemplaza por una cifra inventada.

### Bloque 9B Relación entre masa y energía

1. Explicar E = mc² como relación entre masa y energía de reposo, sin afirmar que toda esa energía puede extraerse mediante cualquier reacción. Para discutir liberación por una reacción, explicar el significado de la diferencia de masa relevante mediante ΔE = Δm c².
2. Definir qué sistema y qué estados se comparan. Si una reacción incorpora material del ambiente, no atribuir la masa de todos sus productos únicamente al combustible inicial.
3. Separar masa inicial de la muestra, masa que participa en la reacción y diferencia de masa asociada a la energía liberada. Ninguna de esas cantidades sustituye automáticamente a las otras.
4. Mostrar que los productos conservan la mayor parte de la masa material en los ejemplos de combustión y fisión. Evitar animaciones en las que toda la muestra desaparece y se transforma en un destello.
5. Explicar que energía y potencia son diferentes: cantidad liberada y rapidez de liberación. No derivar una onda de presión o capacidad destructiva únicamente de un valor energético.
6. Presentar energía específica de combustibles con unidades y base explícitas, como MJ por kilogramo de combustible cuando la fuente lo permita. Diferenciar poder calorífico superior e inferior y no mezclarlos en una misma comparación.
7. Para referencias nucleares, utilizar explicaciones y valores científicos publicados con proceso y alcance explícitos. No añadir un conversor de masa de uranio a rendimiento de armas, equivalencias explosivas, radios de daño o víctimas.
8. Mantener las bases de comparación separadas si no son equivalentes. Una cifra por masa de combustible y otra por masa total del sistema no permiten inferir directamente un porcentaje de eficiencia comparable.
9. Indicar explícitamente si la masa de referencia incluye oxidante u otros reactantes. Mostrar en la combustión que los productos incorporan esos reactantes, sin proporcionar proporciones de mezcla ni condiciones para producir una explosión.
10. No restar masas ya redondeadas para obtener una diferencia diminuta. Utilizar valores científicos y precisión apropiada, revisar conversiones entre joules y megajoules y validar con un cálculo independiente. Una comparación aproximada de orden de magnitud debe presentarse como tal.
11. Distinguir un sistema cerrado que retiene energía de otro del que sale energía. No ilustrar desaparición de masa total y, a la vez, mantener esa misma energía dentro del sistema como si fueran dos resultados independientes.

CERN define la masa de reposo en la relación E = mc². DOE explica que la fisión deja productos con menor masa de reposo y libera energía; las fichas deben conservar esa distinción entre productos materiales y energía liberada. [CERN sobre masa](https://atlas-public.web.cern.ch/glossary/mass), [DOE sobre energía nuclear](https://www.energy.gov/ne/history).

#### Criterios de aceptación del bloque 9B

- La explicación diferencia energía de reposo, energía liberada y diferencia de masa, con un sistema explícito; las conversiones y ejemplos tienen verificación independiente.
- Se distingue un sistema cerrado que conserva energía de uno que la transfiere; las masas comparadas incluyen los reactantes pertinentes y no se cuentan productos o energía dos veces.
- Consumir todo el combustible no se presenta como conversión de toda su masa en energía.
- El balance define el sistema y todos los reactantes pertinentes. Una diferencia pequeña no se obtiene restando cantidades redondeadas ni se cuenta la misma energía dos veces.

### Bloque 9C Participación del material y reparto de energía

1. Crear tres explicaciones separadas: fracción del material que reacciona, diferencia de masa asociada a energía y reparto de la energía entre efectos. No agruparlas bajo una etiqueta ambigua de «eficiencia de explosión».
2. Aclarar que puede reaccionar todo el combustible considerado sin convertirse toda su masa en energía: pueden quedar gases u otros productos materiales.
3. Cuando se use un porcentaje, definir su numerador, denominador, proceso y procedencia. Un porcentaje de material consumido, otro de energía aprovechada y otro de energía asociada a una onda no describen la misma magnitud.
4. Representar calor, movimiento, presión, luz y radiación como formas o transferencias de energía pertinentes al caso. Evitar contarlas dos veces: una onda de presión es un fenómeno mecánico y no un depósito de energía adicional independiente de todo movimiento.
5. No declarar que calor u otra forma de energía «se pierde» físicamente. Explicar, cuando corresponda, que deja de estar disponible para el efecto que se está evaluando.
6. Si existen mediciones publicadas de reparto de energía para un caso no militar, mostrar únicamente su alcance y condiciones documentadas. Si no hay porcentajes fiables, usar una explicación cualitativa sin barras numéricas inventadas.
7. No incluir controles para optimizar mezclas, confinamiento, geometría, velocidad de reacción o rendimiento de armas. El módulo explica propiedades y balances; no diseña explosiones.
8. Mantener cada ficha completa según los datos disponibles. Un campo sin información válida se omite o se explica al abrir detalles; no queda como un punto de desarrollo esperando al motor de otro sprint.

#### Criterios de aceptación del bloque 9C

- Fracción participante, diferencia de masa equivalente y reparto de energía se definen por separado; un reparto sin datos cuantitativos se presenta cualitativamente, sin porcentajes inventados.
- Las fichas y explicaciones en los veinte idiomas permiten entender qué permanece después del proceso; no se afirma que la eficiencia sea una propiedad explosiva universal de una sustancia.
- Cada valor y porcentaje tiene unidad, base de comparación y fuente; no existe un porcentaje universal inventado de eficiencia por material.
- No hay conversor de material nuclear a rendimiento de armas ni conexión del catálogo con bajas o daños en ubicaciones reales.

### Bloque 9D Visualizaciones e interacción

1. Incorporar la sección «Materiales y energía» al menú flotante. Al abrirla, mostrar catálogo y detalle en un panel o una vista de lectura cerrable; al salir, recuperar el mismo punto y zoom del globo.
2. Permitir seleccionar un material y comparar hasta dos fichas. Diferenciar comparaciones cuantitativas compatibles de explicaciones de procesos distintos.
3. Crear una visualización de transformación con estados inicial y final, productos materiales y energía liberada. Sus flechas explican el balance y no sugieren que todo el material desaparece.
4. Crear una comparación de energía específica solo con datos verificables y bases compatibles. Si los órdenes de magnitud requieren escala logarítmica, indicarla y explicar cómo se lee; no usar barras que aparenten proporcionalidad lineal.
5. Para explicar relaciones demasiado pequeñas para una escala de pantalla, utilizar ampliación declarada o notación científica. No exagerar silenciosamente una fracción para que sea visible.
6. Añadir la explicación de participación y reparto de energía junto a la ficha solicitada. No mostrar tres indicadores decorativos permanentemente sobre el mapa.
7. Evitar sliders de masa que funcionen como calculadores de rendimiento nuclear o de carga explosiva. Las comparaciones se basan en propiedades publicadas y esquemas científicos con su referencia.
8. Entregar alternativas de lectura y tablas accesibles a las visualizaciones. El color, el movimiento y una animación no pueden ser el único modo de comprenderlas.
9. Localizar fichas, unidades, notación, explicaciones, fuentes y controles en veinte idiomas. La adaptación de derecha a izquierda no invierte el sentido físico del balance.

#### Criterios de aceptación del bloque 9D

- Gráficos, controles, escalas y tablas accesibles funcionan con ratón y teclado en ventanas estrechas y amplias; se mantienen unidades y significado en los veinte idiomas.
- La visualización permite entender qué material participa, qué productos quedan y qué energía se libera; no muestra desaparición completa de la muestra.
- Una escala logarítmica o un esquema ampliado se identifica y tiene alternativa accesible.
- Cambiar de material conserva el contexto de navegación; cerrar la sección devuelve el mapa sin capas o tarjetas sobrantes.
- El bloque funciona de principio a fin sin esperar funcionalidades de otros catálogos.

### Entregables y aceptación

Entregar catálogo inicial, fichas verificadas, comparación de materiales, visualización de masa y energía, explicación de participación y reparto, fuentes y veinte traducciones.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: desarrollar una sección visual de materiales, procesos y balances de energía. Explicar con precisión las tres magnitudes distintas y verificar cada comparación. No representar consumo de material como desaparición total de masa ni transformar el módulo en un optimizador o calculador de explosiones.

## Sprint 10 Verificación integral y entrega

### Objetivo y condición de entrada

Verificar que las entregas aceptadas funcionan juntas y publicar la versión correspondiente cuando se autorice su implementación. Este sprint no sustituye las pruebas de cada función. Si una entrega anterior sigue incompleta, no se inicia la verificación como si estuviera cerrada.

### Bloque 10A Recorridos completos

1. Comprobar exploración global, búsqueda de una ciudad, acercamiento a calles, selección de punto, consulta territorial y cierre de paneles.
2. Comprobar cada categoría, apertura del resultado pertinente, cambio de caso y retorno al mapa. Verificar que ninguna cifra pertenece a una selección anterior.
3. Cambiar idioma antes y después de una consulta, durante una carga y con un panel abierto. Ningún cambio pierde ubicación, área o definición de los datos.
4. Verificar recuperación frente a servicio de mapa, búsqueda o población no disponible, solicitudes fuera de orden, datos parciales y almacenamiento bloqueado.
5. Probar teclado, foco, zoom de texto y movimiento reducido. Evaluar lectores de pantalla en los controles y resultados; un lienzo visual no sustituye descripciones y acciones accesibles.
6. Abrir materiales, comparar fichas, consultar balance de masa y energía y volver al globo. Comprobar fuentes, bases de comparación y unidades, sin perder el contexto territorial.

#### Criterios de aceptación del bloque 10A

- Mapa, búsqueda, población, categorías, Tierra, identidad y materiales completan recorridos integrados con versiones compatibles, sin trasladar trabajo pendiente de sprints ya aceptados.
- Los recorridos anteriores pasan en ventanas estrechas y amplias con datos disponibles y fallos controlados.
- Los veinte idiomas están completos y no se usa la verificación final para aplazar sus revisiones.
- Las limitaciones reales de cobertura se explican al consultar el dato; no se presentan como funciones globales que todavía no existen.

### Bloque 10B Rendimiento y utilidad de la interfaz

1. Reutilizar dispositivo, red y presupuesto fijados en el sprint 1, y los límites de consulta fijados en el sprint 3. Ampliar la medición a recorridos completos sin estrenar los objetivos al final. Registrar resultados reales; no inventar cifras de rendimiento.
2. Comprobar que se cargan solo las capas, traducciones y datos necesarios; las fuentes y consultas tienen caché y cancelación cuando corresponde.
3. Revisar consumo de memoria y renderizado durante navegación prolongada. Al cerrar casos, liberar recursos, listeners y solicitudes que ya no sirven.
4. Auditar cada elemento visible: qué acción permite o qué información explica. Eliminar lo que solo decora, repite o narra una operación obvia.
5. Observar una prueba de uso con tareas concretas: encontrar una ciudad, cambiar idioma, consultar población y abrir un caso. Registrar bloqueos y corregirlos dentro del bloque.

#### Criterios de aceptación del bloque 10B

- Las mediciones de carga, respuesta y navegación usan el dispositivo y red de referencia previamente fijados y cumplen los presupuestos; los fallos encontrados están resueltos y verificados.
- La revisión de teclado, ventanas estrechas, texto ampliado y tareas del usuario confirma que cada elemento visible tiene una función y que no hay títulos o mensajes redundantes.
- No existen controles sin efecto, paneles vacíos permanentes ni respuestas obsoletas presentadas como actuales.

### Bloque 10C Publicación y comprobación

1. Verificar licencias, atribución, configuración del proyecto y ausencia de credenciales privadas en el cliente o repositorio.
2. Preparar y publicar mediante el flujo de Sites conservando proyecto y audiencia. Las claves y servicios se configuran antes de construir la versión final.
3. Comprobar el resultado de despliegue y realizar una prueba breve sobre la versión publicada, con al menos un idioma de derecha a izquierda y una consulta de datos real.
4. Documentar versión, cambios, pruebas, cobertura de datos y método de recuperación a una versión anterior. No modificar los datos históricos para hacer que una demostración produzca un resultado conveniente.
5. Entregar guía de mantenimiento para actualizar fuentes, traducciones y servicios. Esto es documentación de operación, no un encargo de automatizaciones o funciones recurrentes que el usuario no pidió.
6. Diferenciar recuperación del código y recuperación de datos. Una versión anterior del sitio puede necesitar el manifiesto anterior; una migración aplicada no se deshace solo desplegando código viejo. Mantener compatibilidad con la versión anterior y documentar recuperación hacia delante cuando corresponda.
7. Verificar en el dominio publicado, sin cookies ni cabeceras de identidad o autorización, acceso público a páginas, fichas y API de consulta. Confirmar que no hay registro, inicio de sesión, contraseñas ni solicitud de claves al visitante. Conservar la gestión técnica del proyecto fuera del portal.

8. Comprobar la recuperación documentada con un ensayo acotado que utilice copia o entorno de prueba: versión de código, esquema compatible y manifiesto de datos previo. Identificar qué migraciones ya pueden haber quedado aplicadas aunque falle el despliegue y conservar una ruta de reparación hacia delante; no probar una reversión destructiva sobre los datos alojados reales.

#### Criterios de aceptación del bloque 10C

- URL y versión publicadas se comprobaron con sus API, recursos cartográficos, glifos, fuentes de datos y credenciales; las pruebas corresponden a la entrega que revisará el usuario.
- Código, contenido, datos y traducciones quedan identificados; mantenimiento y recuperación de código y datos están documentados con manifiestos y compatibilidad, sin asumir que revertir código deshace migraciones.
- La versión publicada conserva identidad, audiencia y alcance funcional del proyecto aceptado.
- El ensayo de recuperación tiene evidencia en copia o entorno de prueba y restaura una combinación compatible de código, esquema y datos; no basta una descripción sin comprobar.

### Entregables y aceptación

Entregar versión comprobada, evidencia de recorridos, lista de incidencias resueltas y guía de mantenimiento.

El cierre requiere todas las operaciones y los criterios de cada bloque terminados y verificados, una entrega revisable y la aprobación explícita del usuario.

Instrucción para la IA: verificar y entregar el conjunto terminado. No añadir funciones nuevas ni utilizar este sprint para ocultar trabajo incompleto de los anteriores.

## Contratos comunes para todas las IA

### Estado y datos

- Ubicación: coordenadas con orden explícito, identificador estable y descripción independiente del idioma. Las coordenadas no cambian al traducir.
- Área: geometría, sistema de referencia, origen manual o publicado y fecha si corresponde. No confundir área demográfica con zona de daño.
- Escenario: identificador, categoría, nombres traducidos, tipo de contenido, ubicación histórica cuando corresponda, capacidades, fuentes y versión.
- Población: cantidad, unidad, año, fuente, resolución, método, geometría consultada y estado de cobertura.
- Registro histórico: evento, fecha, indicador, valor o intervalo, definición, fuente y versión. No mezclarlo con una predicción de otra ubicación.
- Material y proceso: identificador de sustancia, estado y composición de referencia, proceso descrito, propiedad energética, unidad, base del denominador, condiciones, fuente y versión. Un material no constituye por sí mismo un modelo de explosión.
- Balance energético: sistema considerado, estados inicial y final, participación del material y formas de energía documentadas. Un reparto numérico requiere mediciones o un modelo válido con su alcance; una explicación cualitativa no lleva porcentajes ficticios.
- Resultado: identificador de petición, firma de entradas, operación realizada, fecha de consulta y entradas que lo produjeron. Modificar una entrada dependiente invalida el resultado; mover solo la cámara o traducir no modifica el hecho consultado.
- Fuente: entidad, enlace, fecha de publicación cuando exista, fecha de consulta y licencia si corresponde. El enlace no reemplaza la definición del dato.

Estos son contratos semánticos. La IA puede adaptar nombres y estructura a la tecnología elegida sin alterar su significado ni introducir operaciones militares excluidas.

### Contrato mínimo de las API

El sprint 1 entrega búsqueda y lectura de fichas; el sprint 3 entrega áreas y población. Una ruta se publica solo cuando tiene función completa, validación y control de costes. Los nombres siguientes son la referencia inicial; si se cambian, actualizar clientes, documentación y pruebas dentro del mismo bloque.

| Operación | Ruta propuesta | Datos esenciales |
| --- | --- | --- |
| Buscar país o ciudad | GET /api/v1/geocode | Consulta, idioma, máximo de resultados; tipo limitado a país o ciudad, identificador, coordenadas y descripción administrativa; calles, direcciones y POI excluidos por servidor |
| Consultar unidad territorial | GET /api/v1/areas/{id} | Identificador estable, nivel, edición y geometría o referencia a su archivo versionado |
| Población administrativa | GET /api/v1/population/admin/{id} | Fuente, edición y año; respuesta del agregado para ese perímetro exacto |
| Población de área dibujada | POST /api/v1/population/area | GeoJSON válido, fuente y edición; respuesta con población, método, cobertura y resolución |

1. Las coordenadas usan orden longitud, latitud en WGS84. El contrato no depende del idioma ni del orden de una etiqueta visible. Validar en servidor cuerpos, enumeraciones, tamaño, tipo de geometría y valores finitos.
2. La respuesta de población identifica unidad, año, datasetId, datasetVersion, boundaryVersion, método, alcance y requestId. Sus estados incluyen disponible, parcial y sin cobertura; no devuelve cero cuando hay un error.
3. Los errores de petición inválida, área excesiva, cuota, servicio no disponible y tiempo agotado tienen código propio y recuperación localizada. El idioma del mensaje puede cambiar; el código y el significado se mantienen.
4. El cliente utiliza cancelación y descarta respuestas que no coincidan con la firma vigente. Cancelar una petición en el navegador no garantiza detener todo cálculo remoto: limitar el trabajo también en servidor.
5. La caché incorpora edición y firma normalizada. No reutilizar una respuesta de población de distinto perímetro, resolución o método aunque sus coordenadas centrales coincidan.
6. No recibir HTML arbitrario como contenido de una ficha ni como resultado de búsqueda. Renderizar texto estructurado escapado y validar enlaces; si se usa Markdown revisado, sanitizar su salida y desactivar instrucciones embebidas como acciones.
7. No registrar tokens, datos de identidad innecesarios ni coordenadas precisas de consultas como telemetría permanente por defecto. Medir latencia, estado y versión sin convertir exploración del usuario en historial personal no solicitado.
8. Definir estados HTTP y códigos estables para entrada inválida, exceso de tamaño, cuota y proveedor no disponible. Limitar consultas anónimas también en servidor y validar su respuesta; no interpretar HTML inesperado como JSON de datos ni recuperar errores pidiendo iniciar sesión.
9. Conservar audiencia pública de Sites y documentar política de caché por consulta, idioma y edición. No guardar perfiles ni identidad del visitante. Las lecturas de archivos respetan versión, integridad y límite de expansión del formato declarado.

### Matriz mínima de verificación por función

| Función | Prueba de cálculo o contrato | Recorrido y presentación |
| --- | --- | --- |
| Mapa y búsqueda | Formato de coordenadas, países y ciudades exclusivamente, rechazo servidor de calles/direcciones/POI/tipos desconocidos y descarte de respuesta antigua | Globo a calles, zoom medido, teclado, GPU ausente y carga de assets publicada |
| Idiomas | Claves completas, selección persistente y alternativas Intl | Veinte idiomas, glifos del mapa, mezcla bidireccional, 200 % de texto y ancho de 320 píxeles CSS |
| Población | Suma independiente, NoData, borde de celda, huecos, multipolígono y fecha | Consultar ciudad y área, límite de tamaño, cobertura parcial, fallo y nueva selección durante carga |
| Casos históricos | Datos y fuentes validados; identificador canónico sin duplicados | Abrir, cambiar y cerrar caso; limpiar capas; conservar el hecho histórico al mover la cámara |
| Ciencia y materiales | Unidades, bases de comparación y conversión independiente | Escalas y balance comprensibles, lectura accesible y veinte traducciones |
| Publicación | Build y contratos reales compatibles con versiones de datos | Dominio Sites, claves, audiencia, recursos externos y procedimiento de recuperación |

Estas comprobaciones se ejecutan al incorporar cada función. El sprint 10 repite únicamente los recorridos integrales y lo que cambie o falle, no sustituye la evidencia anterior.

### Cierre de cada sprint

1. Mostrar el recorrido completo que ya funciona y vincular los cambios con sus criterios de aceptación.
2. Registrar pruebas realmente ejecutadas y sus resultados. Diferenciar verificación técnica, revisión de contenido y revisión lingüística.
3. Documentar proveedor, fuente o decisión nueva que otra IA necesita conservar.
4. Confirmar que no quedan operaciones del bloque esperando funciones de otro sprint.
5. Registrar limitaciones de datos como limitaciones, sin reemplazarlas con cifras inventadas.
6. Mantener las funciones previamente aceptadas. Si cambió un contrato compartido, actualizar todos sus consumidores dentro de la misma entrega.
7. Registrar código, versión de contenido, datos y traducciones que se entregan juntos. Un sprint de contenido no se cierra con un borrador automático pendiente de su revisión científica o lingüística.
8. Actualizar el HTML con los estados y las evidencias finales; registrar la URL y la versión que el usuario revisará. Verificar que ningún punto incompleto figure como terminado.
9. Presentar qué funcionalidad ver en el portal, los pasos para acceder a ella y el resultado esperado. La guía debe corresponder a la versión entregada, no a una función futura o al prototipo anterior.
10. Solicitar la aprobación explícita del usuario y conservar el sprint en «Esperando aprobación». Solo después de recibirla, registrar mensaje y fecha y cerrar el sprint. Si solicita cambios, mantenerlo abierto y repetir las comprobaciones afectadas antes de volver a presentarlo.

### Plantilla para encargar un sprint

> Implementa únicamente el sprint indicado de este plan. Lee primero AGENTS.md, el plan, su revisión técnica y el protocolo de seguimiento. No inicies el sprint si el anterior no tiene aprobación explícita del usuario. Abre su HTML y trabaja sus bloques en orden; no avances mientras las operaciones o criterios de aceptación del bloque anterior sigan pendientes, en curso o no completados. Actualiza la tabla durante el trabajo: verde con letras blancas para terminado y verificado con evidencia, naranja para en curso, rojo con letras blancas para no completado, fallo o bloqueo y sin relleno con letras negras para pendiente. Verifica las condiciones de entrada antes del código dependiente. Conserva el proyecto Sites, su audiencia y el alcance de datos acordado. Entrega todos los bloques, sus traducciones aplicables, estados de error y criterios de aceptación. Prioriza el mapa y elimina contenido redundante. No fabriques datos ni cierres tareas que necesitan trabajo futuro. Al terminar, entrega URL y versión revisables, tabla actualizada, pruebas ejecutadas y pasos concretos con resultados esperados para comprobar las funcionalidades en el portal. Solicita aprobación al usuario; mantén el sprint abierto y no comiences el siguiente hasta recibirla.

## Correspondencia con los requisitos acordados

| Requisito | Sprint responsable |
| --- | --- |
| MAP-001 Zoom a escala de 5 metros | 1 |
| MAP-002 Calles con nombre y ausencia de satélite | 1 |
| MAP-003 Ausencia de puntos de interés comerciales o públicos | 1 |
| MAP-004 Países en el idioma seleccionado | 2 |
| MAP-005 Globo en toda la superficie visible | 1 |
| UI-001 Tarjetas solo cuando se necesitan | 1 y cada función posterior |
| UI-002 Resultados bajo demanda y sin tarjetas de espera | 1, sprints 3 a 7 y 9 |
| UI-003 Textos extensos en disclaimer y etiquetas de datos necesarias | 1 y cada función posterior |
| UI-004 Eliminar encabezado | 1 |
| UI-005 Nombre e icono flotantes | 1 y 8 |
| Población real por países, ciudades y áreas con procedencia | 3 |
| ESC-001 Accidente, Militar y Natural | 4, 5 y 6 |
| EDU-001 Medidas y composición terrestre | 7 |
| EDU-002 Comparaciones de escala con unidades y límites | 7 |
| EDU-003 HAARP y evidencia | 7 |
| EDU-004 Archivo de pruebas subterráneas | 7 |
| EDU-005 Preguntas y fuentes verificables | 7 |
| MAR-001 Mejor nombre del portal | 8 |
| MAR-002 Posibles variantes en español e inglés | 8 |
| IDI-001 Veinte idiomas completos | 2 y cada función posterior |
| IDI-002 Selección automática inicial | 2 |
| IDI-003 Selector manual accesible | 2 |
| IDI-004 Persistencia de elección manual | 2 |
| IDI-005 Alternativa de idioma controlada | 2 |
| MAT-001 Sección especial de materiales desde propano hasta uranio | 9 |
| MAT-002 Comparación visual entre procesos químicos y nucleares | 9 |
| MAT-003 Relación entre masa, diferencia de masa y energía | 9 |
| MAT-004 Participación del material y reparto energético con definiciones | 9 |
| MAT-005 Fuentes, unidades y comparaciones accesibles en veinte idiomas | 9 |
| Facilidad de uso y ausencia de redundancias | Todos, con verificación integral en 10 |
| SEG-001 Archivo HTML con tabla de puntos y estados por color | Cada sprint |
| SEG-002 Actualización durante el trabajo con evidencia | Cada sprint |
| SEG-003 Guía de funcionalidades para revisar en el portal | Cada sprint |
| SEG-004 Cierre aprobado explícitamente por el usuario | Cada sprint |
| SEG-005 Regla persistente hasta finalizar el proyecto | Todos |

La solicitud inicial de estimar bajas de armas colocadas en cualquier lugar no se incluye como una función ejecutable. La planificación conserva exploración territorial, antecedentes y evidencia científica dentro del alcance descrito.
