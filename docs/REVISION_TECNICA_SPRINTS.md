# Revisión técnica del plan de sprints de Mapa Táctico

Fecha: 10 de octubre de 2026. La sección de materiales y energía forma parte del sprint 9 y la entrega integral corresponde al sprint 10. La revisión de los diez sprints encontró veinte problemas o ambigüedades relevantes, corregidos en la versión 2 del [plan de sprints](PLAN_DE_SPRINTS.md).

Las correcciones se formularon durante la planificación, antes de iniciar la implementación. El usuario autorizó el sprint 1 el 10 de octubre de 2026; su estado actual y sus publicaciones parciales se registran en el seguimiento, sin conceder aprobación al sprint. El plan distingue decisiones técnicas que debe resolver cada bloque de funciones ya demostradas: una tecnología propuesta no constituye una integración comprobada.

La versión 6 del plan conserva las veinte soluciones iniciales e incorpora doce hallazgos de la auditoría final descrita al final de este documento. El [protocolo persistente de seguimiento y aprobación](PROTOCOLO_DE_SPRINTS.md) conserva los HTML como documentos de control con las reglas vigentes del plan. Cada bloque tiene criterios propios al final de su tabla y no se pasa al siguiente hasta cumplirlos. La implementación de estas soluciones se registra con evidencia durante su ejecución. Solo el usuario aprueba el cierre de cada sprint después de revisar la funcionalidad en la versión del portal indicada. [Índice de seguimiento](seguimiento/index.html).

## Hallazgos y correcciones

Plan v18, 11oct2026: el usuario solicita retirar completamente el icono y el nombre flotantes del portal. Se actualizan 1B y 8B, sus criterios y guías para impedir su reintroducción. Se conserva Mapa Táctico en Sites, título, metadatos y disclaimer. Reabrir la revisión del sprint1 y comprobar la entrega publicada; no constituye aprobación ni inicio del sprint8.

Plan v17, 11oct2026: el usuario elige «Mapa Táctico». La entrega actual aplica el nombre; el sprint8 verifica su uso internacional sin reabrir la elección. El cambio no aprueba ni inicia otro sprint. Proyecto Sites y URL conservados.

Plan v16,11oct2026: el usuario elige explícitamente «Verificar Chrome y navegador integrado» al resolver la matriz de entornos disponibles. Sustituye la matriz previa de FIN-08 y S01-1B-13. Se conservan las medidas de ventana, teclado y texto al200%; ninguna prueba de otro motor se atribuye a estos entornos.

Plan v15,11oct2026: el usuario autoriza audiencia pública. Todas las páginas y API de consulta son anónimas, sin cuentas, registro, inicio de sesión, contraseñas ni claves del visitante. Se retiran los flujos de sesión caducada de3C y el requisito de impedir acceso anónimo de10C. Cuotas y validación se aplican a consultas anónimas; comprobar el acceso público sin usar identidad del propietario.

Plan v14,11oct2026: el usuario redefine todas las entregas como web app responsiva. La matriz cubre navegadores web y tamaños de ventana; se retiran requisitos de plataformas adicionales de operaciones, criterios y guías de los diez sprints.

Actualización de alcance · Plan v11, 11 de octubre de 2026: por instrucción del usuario, la búsqueda geográfica se limita a países y ciudades. El plan actualiza proveedor, operaciones S01-1B-05/12, criterios AC-04/08, localización S02-2C-08 y contrato geográfico común. Exige lista permitida de tipos en servidor y proveedor, incluida la caché, y pruebas que excluyan calles, direcciones, edificios, barrios, POI y tipos desconocidos. Los nombres de calles del mapa conservan su requisito. La búsqueda real sigue pendiente de proveedor e integración; este cambio documental no acredita su desarrollo.

| ID | Prioridad | Problema del plan anterior | Corrección incorporada |
| --- | --- | --- | --- |
| REV-01 | Alta | La fuente actual es estática y el plan pedía API, secretos y consultas sin asignar su servidor | Arquitectura TypeScript, React y starter servidor de Sites; migración funcional en sprint 1 |
| REV-02 | Alta | El globo D3 de países no puede producir calles solo aumentando el zoom | Sustitución cartográfica mediante MapLibre y proveedor vectorial; glifos, sprites y estilo incluidos |
| REV-03 | Alta | «Zoom de 5 metros» no era una prueba reproducible | Criterio de 0,2 metros por píxel CSS o más cercano, segmento de 5 metros y registro de proyección, coordenadas y viewport |
| REV-04 | Media | La navegación global prometía implícitamente detalle local para cualquier coordenada | Separar vista global, límites de proyección, detalle urbano y cobertura real del proveedor |
| REV-05 | Alta | Se podía asumir que una API de WorldPop ya hacía estadísticas por cualquier polígono | Distinguir catálogo y descarga de cálculo zonal; demostración de consulta real y ruta de ingesta definida |
| REV-06 | Alta | Procesamiento mundial, memoria, CPU y almacenamiento no tenían una solución asignada | Preparación fuera de Workers, bloques y agregados, D1 para metadatos y R2 para archivos; GIS externo solo si se configura en sprint 3 |
| REV-07 | Alta | Un punto de búsqueda se trataba como si aportara el límite de una ciudad | Proveedor de límites, nivel administrativo y edición separados del geocodificador; identificación por código |
| REV-08 | Alta | Se mezclaban potencialmente censo oficial y suma modelada de distinta fecha | Mantener magnitudes, perímetros y años independientes; edición coherente para comparaciones raster |
| REV-09 | Alta | Geometrías complejas y errores de celda podían generar resultados incorrectos | Validación de huecos, multipolígonos, NoData, meridiano 180, unión sin duplicados y precisión interna |
| REV-10 | Alta | Las cifras arbitrarias seguirían en la interfaz limpia esperando sprints posteriores | Retiro completo en sprint 1 y recorrido útil con fichas existentes; los catálogos posteriores no heredan esa limpieza pendiente |
| REV-11 | Alta | Los módulos requerían fichas y capas comunes sin responsable claro | Renderizador, fuentes, registro de capacidades y limpieza entregados en sprint 1 |
| REV-12 | Alta | Veinte traducciones no garantizaban veinte escrituras y formatos dentro del mapa | Glifos, composición bidireccional, formatos Intl alternativos, capa de países y revisión lingüística identificada |
| REV-13 | Media | Cambiar punto, cámara o idioma podía borrar hechos o mostrar respuestas obsoletas | Firma de entradas, requestId y descarte de respuestas; invalidación solo de datos dependientes |
| REV-14 | Alta | Búsqueda sin proveedor, cuota ni política de autocompletado | Selección explícita de proveedor, caché permitida, cancelación y política; no utilizar Nominatim público para sugerencias |
| REV-15 | Media | «Si hay datos» permitía terminar módulos espaciales sin su función geográfica | Selección previa de casos; Natural exige al menos un caso con geometría documentada y consulta real |
| REV-16 | Media | Casos militares y pruebas subterráneas podían duplicar hechos y versiones | Identificadores canónicos y repositorio común; mínimo de casos y separación entre módulos y sus vistas |
| REV-17 | Media | La entrada de identidad confundía nombre elegido con decisión dentro del bloque | Entrada por criterios, propuestas y elección en 8A; aplicación en 8B después de la selección concreta |
| REV-18 | Alta | «Eficiencia de explosión» podía mezclar consumo, masa equivalente, energía y efectos | Tres magnitudes definidas, sistema y reactantes explícitos, valores con bases comparables y sin porcentajes universales inventados |
| REV-19 | Media | Rendimiento, GPU y accesibilidad se podían descubrir demasiado tarde | Objetivos y entorno desde sprint 1, límites desde sprint 3 y comprobaciones por función; sprint 10 verifica integración |
| REV-20 | Alta | Publicar código anterior parecía suficiente para recuperar datos y migraciones | Manifiestos versionados, activación atómica y recuperación de código y datos por separado; audiencia verificada al publicar |

## Revisión por sprint

| Sprint | Resultado de la revisión | Condición pendiente para ejecutar |
| --- | --- | --- |
| 1 | Incorpora servidor, mapa completo, búsqueda, estados y funciones comunes; elimina dependencia futura para retirar cifras ficticias | Elegir proveedores y probar versión, GPU, glifos y build del starter |
| 2 | Distingue traducción, formatos, escritura y etiquetas del mapa; no depende de que Intl cubra todos los idiomas | Completar catálogos y disponer de revisión lingüística identificada |
| 3 | Define límites administrativos, ingesta, cálculo acotado y validación de geometrías; no presupone una API zonal | Seleccionar edición y demostrar cálculo dentro del presupuesto o configurar GIS externo |
| 4 | Conserva tres experiencias de accidente con datos pertinentes y fechas correctas | Obtener y revisar fuentes de cada caso; no inventar predicción de víctimas |
| 5 | Exige dos fenómenos documentados y al menos una consulta espacial real | Obtener geometría publicada y comprobar compatibilidad temporal con población |
| 6 | Exige casos históricos convencional y nuclear, con alcance y fuentes propios | Seleccionar y revisar los casos; ninguna dependencia de un motor de armas |
| 7 | Unifica eventos citados y separa observación, interpretación y magnitud sísmica | Completar fuentes, contenidos y revisión científica de los casos elegidos |
| 8 | Tiene una decisión explícita antes de aplicar identidad y mantiene el proyecto | Selección de nombre por el usuario después de recibir opciones concretas |
| 9 | Completa materiales, procesos, balances, fuentes, accesibilidad y traducciones | Verificar propiedades, denominadores, precisión y revisión científica de cada comparación |
| 10 | Verifica funciones aceptadas con presupuestos previos y recuperación de versiones | Sprints anteriores cerrados, servicios disponibles y audiencia confirmada |

Cada condición se resuelve dentro del bloque indicado, antes del código dependiente. No se ha añadido un sprint de infraestructura aislado ni una fase final para completar funciones a medias.

## Tecnologías que faltan en la fuente actual

El repositorio contiene HTML, CSS, JavaScript y activos D3 con un manifiesto estático. No contiene la arquitectura servidor propuesta, MapLibre, servicio de calles, geocodificación, glifos multilingües, consulta poblacional, edición de polígonos, almacenamiento de conjuntos ni pruebas del alcance nuevo. Su ausencia es una diferencia entre prototipo y plan, no un error de ejecución ya comprobado en esas tecnologías.

La arquitectura asigna cada incorporación al primer sprint que la necesita. MapLibre y servidor llegan en el sprint 1; catálogos de idioma y composición se completan en el 2; Terra Draw, datos preparados, D1 y R2 se incorporan en el 3. D3 puede seguir aportando gráficos en el sprint 9, pero deja de ser la solución del mapa de calles.

## Evidencia técnica consultada

- MapLibre presenta un globo con cartografía vectorial y documenta la integración de Terra Draw. Su compatibilidad concreta debe comprobarse en el conjunto de versiones elegido. [Ejemplo de globo vectorial](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/), [Integraciones](https://maplibre.org/maplibre-gl-js/docs/plugins/).
- MapLibre 6 usa ESM y exige WebGL2; además, la documentación actual marca el antiguo plugin RTL como obsoleto porque incorpora composición árabe y bidireccional. Esto no elimina la obligación de aportar glifos y probar otras escrituras. [Migración a MapLibre 6](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/), [Composición RTL](https://maplibre.org/maplibre-gl-js/docs/API/functions/setRTLTextPlugin/).
- Workers tiene límites de memoria y CPU que obligan a acotar las consultas y preparar archivos grandes fuera del runtime de petición. [Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/).
- La documentación REST de WorldPop consultada describe datos, metadatos y archivos descargables. No acredita por sí sola el servicio de suma por polígono que requiere el portal. [WorldPop REST](https://www.worldpop.org/sdi/introapi/).
- La instancia pública de Nominatim prohíbe autocompletado; no sirve como atajo para implementar las sugerencias planeadas. [Política de Nominatim](https://operations.osmfoundation.org/policies/nominatim/).

El servidor, almacenamiento y credenciales de Sites se revisaron contra la habilidad instalada y el README de su starter oficial. Las especificaciones científicas mantienen las fuentes primarias ya vinculadas en los sprints 7 y 9.

## Alcance y decisiones abiertas

El plan puede guiar el desarrollo con las decisiones y pruebas de entrada indicadas. No permite afirmar todavía que exista cobertura mundial completa a nivel de calles o de población, que un proveedor tenga un contrato compatible o que todos los idiomas estén revisados. Esas comprobaciones son entregables explícitos del bloque correspondiente.

La parte militar conserva contexto y registros históricos, y la demografía no se convierte en estimaciones de bajas por ataques. Para accidentes y fenómenos naturales, el plan tampoco encarga un modelo físico predictivo de víctimas; entrega antecedentes y consulta territorial. Esto está expresado como alcance, no como un requisito satisfecho mediante cifras inventadas.

Las decisiones que requieren proveedor, presupuesto, revisor o selección de marca permanecen identificadas. No se trata su ausencia como aprobación ni como integración ya resuelta. Tampoco se publica el sitio con cambios de acceso por el hecho de haber completado esta revisión.


## Auditoría técnica final · Plan v6

Fecha: 10 de octubre de 2026. Alcance: los diez sprints, 27 bloques, operaciones, criterios, contratos comunes, dependencias y el generador de los documentos de control. Se contrastaron requisitos del motor cartográfico con documentación oficial actual y la configuración de Sites con el starter instalado. No se desarrollaron ni publicaron las nuevas funciones del portal.

Se encontraron doce hallazgos adicionales. Las correcciones de especificación ya están incorporadas al plan y a los HTML. FIN-10 a FIN-12 también requirieron reparar y probar el seguimiento existente. «Corregido en el plan» no significa «implementado en el portal».

| ID | Prioridad | Hallazgo concreto | Corrección y punto de control |
| --- | --- | --- | --- |
| FIN-01 | Alta | 1A exigía aceptar el buscador que se construye en 1B. La instrucción de identidad decía decidir y aplicar en un mismo bloque pese a separar 8A y 8B; esperar el nombre permitía interpretar que se podía avanzar | Retirar búsqueda del criterio S01-1A-AC-03 y comprobarla en S01-1B-12/AC-08. Identidad se decide en 8A y aplica en 8B; mientras falta decisión solo se revisa trabajo ya entregado |
| FIN-02 | Alta | Se pedía comprobar workers de MapLibre sin concretar su resolución en Vite ni CSS; una prueba del servidor de desarrollo podía ocultar un build roto | S01-1A-11 y AC-04: worker servido por el build, setWorkerUrl, CSS, MIME, CSP y API pública; conservar sites() del starter. La release 6.13.0 es candidata, no una dependencia instalada |
| FIN-03 | Alta | Se podía cerrar la elección cartográfica y descubrir después que las fuentes/composición no sirven para los veinte idiomas. El proveedor no necesariamente reconoce todos sus locales ni devuelve países traducidos | S01-1A-12/AC-05 comprueban escrituras antes de cerrar el motor; S02-2C-08/AC-05 usan countryId y nombres/alias propios para búsqueda y presentación de países sin inventar nombres de calles |
| FIN-04 | Alta | D1/R2 se nombraban sin operación explícita de bindings, esquema, migración ni canal de carga alojada. Tener datos locales no demuestra que el servidor publicado los tiene | S03-3A-10/13 y AC-05/08: bindings, Drizzle, SQL de estructura, carga real autorizada e idempotente, integridad y activación. Si falta canal o permiso, resolver GIS externo dentro de 3A; no pasar a 3B |
| FIN-05 | Alta | «Bloques de población» no definía qué bytes lee el Worker ni cómo interpreta CRS, celdas, compresión y NoData | S03-3A-11/AC-06: formato versionado y decodificador TypeScript con dimensiones, transformación, tipos, máscara, integridad y límites de expansión; validación independiente de la ingesta |
| FIN-06 | Alta | Faltaba motor concreto para unión/intersección y un contrato entre geometría dibujada, simplificada y calculada. Gestos de Terra Draw podían competir con selección y zoom | S03-3A-12/AC-07 selecciona motor y método de superficie; S03-3B-13/AC-06 conserva área original y resuelve modos/gestos. polygon-clipping es candidato plano, no una solución de geodesia o del meridiano 180 |
| FIN-07 | Alta | Errores y cuotas se mencionaban sin exigir su recorrido integrado; tipos TypeScript no verifican respuestas mal formadas o HTML inesperado. La caché podía confundirse con una autorización | S01-1B-12/AC-08, S03-3C-08/AC-05 y contratos 8/9: validación de runtime, límites reales de consultas anónimas, estados de cuota/proveedor, respuesta comprobada y recuperación sin inicio de sesión; mantener caché por consulta, idioma y edición |
| FIN-08 | Media | La interfaz responsiva no fijaba navegadores ni dimensiones de ventana verificables. «Justificar» un objetivo de rendimiento podía permitir reducirlo unilateralmente | S01-1B-13/AC-09 fija Chrome y navegador integrado, versiones, texto al200% y ventanas desde320CSS hasta formatos amplios. Ajustar presupuesto exige propuesta concreta aceptada por el usuario; navegadores no probados quedan pendientes |
| FIN-09 | Media | Se exigía búsqueda en 7C sin una operación que la desarrollara; el mínimo de seis materiales podía interpretarse como una propuesta aplazable. La recuperación final tenía descripción, pero no ensayo obligatorio | S07-7C-09 entrega búsqueda localizada. S09-9A-08/AC-04 completa seis fichas. S10-10C-08/AC-04 comprueba recuperación de código/esquema/datos en copia o entorno de prueba |
| FIN-10 | Alta | El parser copiaba solo la primera línea de una operación: el HTML omitía la exigencia espacial adicional de S05-5A-01. Tampoco rechazaba IDs duplicados ni números de sprint fuera de orden | Parser conserva continuaciones indentadas y valida sprints 1–10 e identificadores únicos. Pruebas verifican texto completo en HTML y que un plan inválido no sobrescriba estados |
| FIN-11 | Alta | Cambiar requisitos de un sprint anterior podía dejar aprobado un posterior o permitir seguir modificando uno en curso; reabrir no obligaba siempre a repetir criterios ya verdes | sync retira aceptación, entrega y criterios afectados en cascada; reopen exige reverificación; todos los comandos comprueban aceptación vigente de los sprints previos. Evidencias e historial se conservan |
| FIN-12 | Alta | Cambiar arquitectura, reglas o contratos comunes sin alterar el texto de una operación podía conservar aprobaciones obsoletas; el mensaje de sync afirmaba siempre que no había desarrollo iniciado | contextHash controla secciones comunes e invalida su aceptación desde el sprint 1 al cambiarlas. El mensaje de sincronización describe lo que hizo. Pruebas de cambios comunes y de un estado previo inconsistente impiden avanzar |

### Comprobación por sprint después de las correcciones

| Sprint | Bloques | Operaciones | Criterios | Resultado documental |
| --- | --- | --- | --- | --- |
| 1 | 1A–1C | 36 | 19 | Aceptación cartográfica sin depender de búsqueda futura; worker, fuentes, búsqueda y navegadores tienen responsables |
| 2 | 2A–2C | 23 | 13 | Veinte idiomas y país localizado incluyen alternativa propia si el proveedor no soporta un locale |
| 3 | 3A–3C | 34 | 19 | Configuración, carga alojada, formatos, lector y geometría se resuelven antes de dibujo y resultados |
| 4 | 4A–4B | 14 | 8 | Tres casos completos reutilizan consulta ya entregada; antecedentes y población siguen separados |
| 5 | 5A–5B | 11 | 8 | Dos casos y al menos una consulta espacial real; el HTML conserva el requisito completo de geometría |
| 6 | 6A–6B | 9 | 7 | Casos convencional/nuclear históricos completos; sin dependencia del futuro módulo científico |
| 7 | 7A–7C | 20 | 11 | Medidas, evidencia y tres pruebas de dos países; búsqueda exigida tiene operación propia |
| 8 | 8A–8B | 11 | 9 | La decisión humana precede a su aplicación; esperar el nombre no autoriza avanzar |
| 9 | 9A–9D | 36 | 17 | Seis fichas, magnitudes y bases científicas separadas; gráficos no bloquean la aceptación del catálogo |
| 10 | 10A–10C | 19 | 11 | Integración sobre funciones previamente aceptadas; recuperación de versiones requiere ensayo |
| Total | 27 | 213 | 122 | 335 puntos de control, conservando diez sprints y once HTML |

### Verificación efectuada y límites

La batería de seguimiento pasó en una carpeta temporal fuera del proyecto. Comprueba condiciones de paso entre bloques, evidencia, aceptación humana registrada, invalidación por fallo, textos escapados, secciones, escrituras acotadas y servidor de lectura con ETag. La auditoría añadió casos de operaciones multilínea, IDs duplicados, invalidación de una aprobación posterior, detención de sprints en curso, contratos comunes y reapertura con criterios pendientes. Las aprobaciones ficticias de esas pruebas no se escribieron en los estados reales.

En el seguimiento real siguen pendientes todas las operaciones y criterios, y no hay sprints aprobados ni nuevas funciones del portal desarrolladas por esta auditoría. Los HTML se regeneran desde el plan v6. La revisión valida consistencia documental y el mecanismo de control; no acredita compatibilidad de bibliotecas aún no instaladas, rendimiento de proveedores aún no seleccionados ni exactitud de una ingesta aún no ejecutada.

No encontré otra dependencia hacia un bloque futuro en los criterios revisados después de corregir FIN-01. El riesgo técnico principal restante es demostrar proveedor, fuentes/composición y build en 1A, y carga alojada/formato/cálculo dentro del presupuesto en 3A. Son operaciones de entrada obligatorias con evidencia; no se transfieren a otro sprint. Sigue siendo necesaria la elección humana de nombre en 8A y las revisiones científicas y lingüísticas de los contenidos que se incorporen.

### Evidencia de la auditoría final

- La guía oficial de MapLibre 6 distingue carga directa ESM de integración con bundlers; documenta worker y CSP. La release consultada es v6.13.0 del 6 de octubre de 2026. [Guía de migración](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/), [release verificable](https://github.com/maplibre/maplibre-gl-js/releases/tag/v6.13.0).
- polygon-clipping documenta operaciones booleanas de polígonos/multipolígonos. Su selección como candidato no demuestra por sí misma geodesia, validación de entrada ni compatibilidad del build; esas pruebas se exigen en 3A. [Repositorio del motor](https://github.com/mfogel/polygon-clipping).
- GeoJSON y GeoTIFF tienen contratos de coordenadas y archivos distintos; el lector y la ingesta deben declarar el formato que realmente utilizan. [RFC 7946](https://www.rfc-editor.org/rfc/rfc7946), [GDAL GeoTIFF](https://gdal.org/en/stable/drivers/raster/gtiff.html).
- Los límites del runtime justifican medir memoria expandida, concurrencia y trabajo por consulta, sin inferir capacidad por el tamaño comprimido. [Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/).
- Zod es una candidata a validación de runtime compartida; los tipos de compilación no reemplazan los esquemas y casos de respuesta exigidos en el plan. [Documentación Zod](https://zod.dev/).
- Sites se contrastó con el starter y la referencia de almacenamiento instalados: Node >=22.13.0, integración sites(), bindings DB/BUCKET, Drizzle, migraciones y separación local/alojada. El starter no usa wrangler.jsonc. No se cambiaron manifiesto ni audiencia del sitio.

## Corrección de ejecución del bloque1A — plan versión7

Al ejecutar el sprint se detectó que la primera operación aún decía integrar completamente búsqueda, mientras1B era responsable de su aceptación. Se corrigió1A-01 para entregar mapa y rutas de referencia, conservar fuentes del contenido y dejar la integración de búsqueda/fichas en sus bloques correspondientes. Conserva el alcance del sprint; elimina una dependencia circular que habría impedido pasar de1A a1B. Los diez HTML fueron sincronizados con la versión7; la corrección no acredita desarrollo de1B/1C.

## Selección sucesiva de resultados — plan versión19

El usuario solicita conservar abierta la búsqueda al elegir una ciudad. La operación 1B-05 y su criterio de ambigüedad especifican consulta/lista/posición de lectura persistentes, cierre con X o clic fuera y conservación de la última ubicación. Se distingue un arrastre de un clic para mantener la exploración con la lista visible. El clic de cierre sobre el mapa no debe crear otro punto; la navegación a otra herramienta mantiene su acción normal. Escape y devolución del foco se conservan. Se reabre la aceptación anterior del buscador y la del Sprint2 dependiente, con historial, sin conceder nuevas aprobaciones. Los diez HTML reflejan el plan19. La evidencia de ejecución se registra en docs/CAMBIO_BUSQUEDA_PERSISTENTE.md y en el seguimiento.
