# Seguimiento y aprobación de los sprints

Instrucción persistente del usuario, establecida el 10 de octubre de 2026, vigente hasta finalizar el proyecto completo. El desarrollo sigue los diez sprints del [plan](PLAN_DE_SPRINTS.md) y las soluciones de la [revisión técnica](REVISION_TECNICA_SPRINTS.md). Cada sprint entrega una función completa, una tabla HTML actualizada durante el trabajo y una versión del portal que el usuario pueda revisar antes de aprobar su cierre.

## Estados de los puntos

Requisito vigente desde el 11 de octubre de 2026: el buscador geográfico solo ofrece países y ciudades, con exclusión de calles, direcciones, edificios, barrios y puntos de interés en proveedor, servidor y caché. Los nombres de calles visibles en el mapa conservan su requisito independiente. La restricción se desarrolla y comprueba en 1B, y se mantiene en traducciones y recorridos posteriores; documentarla no equivale a tener el proveedor integrado.

| Color | Estado | Condición |
| --- | --- | --- |
| Verde y letras blancas | Terminado | Desarrollo y verificación correspondientes completos; evidencia registrada |
| Naranja y letras negras | En curso | Trabajo en desarrollo, sin darlo por terminado |
| Sin relleno y letras negras | Pendiente | Trabajo no iniciado |
| Rojo y letras blancas | No completado | Intento incompleto, verificación fallida o bloqueo; explicar motivo y acción necesaria |

Un punto no se vuelve verde solo por haber escrito código. Debe cumplir su operación completa y contar con evidencia del resultado. Los criterios de aceptación también tienen filas propias. Las pruebas técnicas, científicas y lingüísticas conservan su significado; una no sustituye a otra.

Los informes tienen fondo blanco. El portal mantiene una presentación independiente: fondo exterior negro #000000 con estrellas pequeñas, discretas y estáticas, globo azul #003876 y componentes blancos. Las filas «Terminado» tienen fondo verde y letras blancas; las filas «No completado», fondo rojo y letras blancas; las filas «Pendiente», sin relleno y letras negras. Las filas «En curso» conservan fondo naranja y texto negro. El indicador comparte exactamente el fondo y el color del texto de su fila, sin otro tono ni recuadro diferenciado. La presentación se conserva al actualizar los estados en vivo y al generar los HTML. El índice aplica la misma presentación: sprint en curso en naranja, aprobado en verde, no completado en rojo y pendiente sin relleno; el avance técnico nunca concede aprobación humana.

Las soluciones REV-01 a REV-20 están incorporadas a las operaciones del plan. Su implementación se verifica en el sprint responsable. No colorear en verde una función del portal porque su solución ya figure en un documento.

La auditoría final FIN-01 a FIN-12 añade operaciones y criterios dentro de sus bloques y corrige la consistencia del documento de control. El plan v6 conserva diez sprints y 27 bloques, con 213 operaciones y 122 criterios. Los HTML no omiten las continuaciones de un requisito escrito en varias líneas.

Cada bloque aparece en una sección independiente con su propia tabla. Sus criterios de aceptación están al final, después de las operaciones; no se agrupan en una sección aplazada hasta terminar el sprint. Los títulos de sección y encabezados de columna tienen fondo azul #003876 y letras blancas. Al terminar y verificar todas las operaciones y criterios, la sección se colapsa automáticamente; el título y una flecha permanecen disponibles para abrirla con clic o teclado. La apertura manual se conserva al actualizar o recargar el informe. Si un punto vuelve a pendiente, en curso o no completado, la sección se abre de nuevo para mostrarlo. El colapso no constituye aprobación del sprint.

## Paso entre bloques

Los bloques se trabajan en el orden del plan. No comenzar el siguiente hasta terminar las operaciones y verificar todos los criterios del anterior con evidencia. El registro rechaza cambios de estado de un bloque posterior mientras exista un bloque previo sin completar. Tampoco permite marcar un criterio como cumplido si hay operaciones incompletas en su propio bloque. La tabla identifica el primer bloque que falta con «Requiere 1A», por ejemplo; se pueden consultar los puntos futuros sin iniciar su desarrollo.

Si una operación o un criterio ya cumplidos cambian o fallan, el bloque vuelve a quedar abierto. Los criterios afectados y los de bloques posteriores regresan a pendiente y requieren nueva comprobación antes de continuar. Las operaciones desarrolladas conservan su historial, pero no sustituyen una aceptación vigente. Este paso no añade una aprobación humana por bloque: el usuario aprueba el final de cada sprint, como ya está acordado.

## Archivos y actualización durante el trabajo

Cada sprint dispone de `seguimiento/sprint-NN.html`, con sus operaciones y criterios de aceptación, estado, evidencia y guía de revisión. [El índice](seguimiento/index.html) permite consultar los diez sprints. La fuente de estados es `seguimiento/estado.json`; el generador conserva los estados al sincronizar el plan y escribe solo los archivos que cambian.

El HTML es el documento para vigilar el cumplimiento. Incluye la versión del plan y sus reglas de control, tomadas de la sección «Documento de control del cumplimiento» del plan. Cuando el usuario modifica requisitos o reglas, actualizar el plan y sincronizar los HTML afectados. No sustituir esta actualización documental por un cambio del temporizador o de la presentación de la pantalla.

El informe se abre al comenzar el sprint y se actualiza después de cada transición real. El servidor local de seguimiento ofrece lectura en vivo cada tres segundos mientras la pestaña es visible. Usa solicitudes condicionales y no escribe en el disco por el mero paso del tiempo. Una conexión interrumpida muestra su estado y conserva el último contenido, sin aparentar actualización vigente. El informe no promete actualizaciones autónomas mientras una IA no está trabajando.

La vista consulta el propio HTML generado: los cambios de puntos, criterios, evidencias y estructura aparecen sin recarga manual. También detecta cambios de CSS y JavaScript y carga automáticamente la nueva presentación. Conserva la posición de lectura y las preferencias de apertura de los bloques. Las comprobaciones no reescriben archivos ni regeneran el informe cuando no hay cambios.

Si se abre directamente como archivo HTML, muestra una copia de los estados al generar el archivo. Para recibir actualizaciones sin recargar, abrirlo mediante el servidor local. Los HTML y la fuente de estados son archivos del proyecto, no recursos publicados con el portal.

## Aprobación del usuario

1. La IA termina las operaciones y verifica los criterios. Los resultados verdes describen avance técnico; no conceden aceptación.
2. La IA prepara la entrega revisable: URL real, versión de código y contenido, evidencias y pasos para revisar en el portal con resultados esperados. Completar o ajustar la guía prevista en el HTML a la interfaz realmente desarrollada.
3. El sprint pasa a «Esperando aprobación». La IA presenta la entrega concreta y solicita al usuario que la revise.
4. Solo una aprobación explícita del usuario permite registrar «Aprobado», con fecha y referencia al mensaje. No hay aprobación automática en la tabla ni por vencimiento de un plazo.
5. Si el usuario pide cambios, el sprint permanece abierto. Registrar su mensaje y actualizar los puntos afectados; la nueva entrega vuelve a requerir revisión.
6. No empezar el siguiente sprint hasta aprobar el actual. El proyecto termina cuando el usuario aprueba el sprint 10 y no quedan puntos incompletos.

La aprobación autoriza el cierre del sprint. No implica cambiar la audiencia de Sites, contratar servicios, escoger una marca no seleccionada ni otras acciones fuera del alcance acordado. La vista revisable se prepara dentro del alcance de publicación o vista previa que esté autorizado en ese momento.

## Uso por las IA

Ejecutar desde la raíz del proyecto:

```powershell
node scripts/seguimiento-sprints.mjs sync
node scripts/seguimiento-sprints.mjs serve
```

Abrir `http://127.0.0.1:4174/` o `http://127.0.0.1:4174/sprint-01.html`. El servidor no modifica el portal ni ofrece una API de escritura. Para iniciar un sprint y registrar trabajo real:

```powershell
node scripts/seguimiento-sprints.mjs start --sprint 1
node scripts/seguimiento-sprints.mjs set --id S01-1A-01 --status en_curso --evidence "Migración en desarrollo"
node scripts/seguimiento-sprints.mjs set --id S01-1A-01 --status terminado --evidence "Indicar aquí la prueba real, versión y resultado"
node scripts/seguimiento-sprints.mjs set --id S01-1A-02 --status no_completado --evidence "Indicar aquí el fallo o bloqueo y su resolución necesaria"
```

Estos ejemplos son sintaxis; no constituyen evidencia ni autorizan poner filas verdes. Los identificadores de aceptación tienen forma `S01-1A-AC-01`. Registrar las operaciones de 1A, comprobar sus criterios y solo entonces trabajar 1B. Consultar los identificadores en cada tabla.

Para ajustar el recorrido a la función realmente entregada, preparar un JSON con una lista de objetos `action` y `expected` y ejecutar `guide --sprint N --file "Ruta del JSON"` antes de presentar la revisión. Cada acción y resultado esperado deben corresponder a controles que ya existan en la entrega.

Al preparar la aceptación y después de recibir respuesta explícita:

```powershell
node scripts/seguimiento-sprints.mjs review --sprint 1 --url "URL de la entrega realmente revisable" --version "Versión real de código y contenido"
node scripts/seguimiento-sprints.mjs approve --sprint 1 --reference "Referencia y texto del mensaje de aprobación del usuario"
```

El comando `review` rechaza una entrega con puntos no terminados o sin evidencias. El comando `approve` requiere estado de revisión y referencia al mensaje del usuario; la IA debe comprobar que esa autorización existe. Una cadena escrita por la IA no sustituye al mensaje humano. Los cambios solicitados se registran con `reject --sprint N --reference "Mensaje del usuario"`; la IA vuelve a marcar los puntos afectados y prepara una nueva revisión.

Si cambia el texto de un punto terminado al sincronizar el plan, vuelve a pendiente. Si cambia la entrega tras presentarla, se retira el estado de revisión. Conservar el historial de cambios y aprobación; no editar los JSON para saltar estas condiciones. Si hay que reabrir un sprint aprobado, usar `reopen --sprint N --reference "Instrucción explícita del usuario y motivo"` y detener el trabajo de sprints posteriores hasta resolverlo.

Un cambio de requisitos invalida la aceptación del primer sprint afectado y de los posteriores. Un cambio de las reglas, arquitectura o contratos comunes exige nueva comprobación desde el sprint 1. Los criterios antes verdes vuelven a pendiente; las operaciones que no cambiaron conservan su evidencia como historial de trabajo, sin sustituir la aceptación vigente. Reabrir también retira los criterios cumplidos y las aprobaciones posteriores. Todos los comandos de modificación comprueban que los sprints anteriores sigan aprobados. El mecanismo verifica las condiciones de registro; la IA sigue siendo responsable de que la referencia de aprobación corresponda a un mensaje humano real.

## Entrega de cierre

La respuesta de la IA debe contener enlace al HTML, enlace al portal o vista previa realmente comprobada, versión entregada, funcionalidades modificadas y recorrido manual con resultado esperado. Añadir únicamente incidencias o límites relevantes para aceptar esa entrega. Formular la solicitud de aprobación después de preparar y comprobar el trabajo, conservando el sprint abierto hasta recibir respuesta.
