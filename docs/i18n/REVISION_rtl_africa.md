# Revisión lingüística: árabe, urdu, punyabí occidental, suajili, hausa y ruso

Fecha: 11 de octubre de 2026. Bloque: Sprint 2B. Revisor identificado: agente `/root/catalogos_rtl_africa`, IA Codex. Se realizó una segunda lectura de las seis traducciones completas después de redactarlas y una comprobación del contexto de los títulos en `components/map/Portal.tsx`. Esta es revisión lingüística por IA; no se atribuye a hablantes nativos, traductores humanos ni organismos de certificación.

## Cobertura

Cada archivo conserva exactamente las 83 claves de `content/i18n/es.json`: controles visibles y accesibles, paneles, errores, fichas, fuentes, metadatos, textos largos, información de cartografía y disclaimer. Se conservan el nombre propio `Mapa Táctico`, los proveedores `GeoNames`, `OpenStreetMap` y `Sites`, y los identificadores de teclado `Tab` y `Escape`. Los nombres de Naciones Unidas y del Comité Internacional de la Cruz Roja están traducidos; no se modifica la institución citada ni sus enlaces.

| Catálogo | Variedad y decisiones verificadas |
| --- | --- |
| `ar.json` | Árabe estándar moderno, no dialectal. Acciones coherentes, límites y recuperación explícitos; plural general mediante «عدد النتائج» para evitar usar el plural de tres a diez con cero, dos o decenas. |
| `ur.json` | Urdu en escritura árabe, tratamiento cortés y acciones verbales coherentes. Las descripciones preservan «heridos o fallecidos», la cuota compartida y las limitaciones históricas. |
| `pnb-Arab.json` | Punyabí occidental en shahmukhi. Se usan construcciones punyabíes como `وچ`, `نوں`, `نال`, `لبھو`, `نئیں`, `اے` y `نیں`; no es una copia del urdu ni un catálogo gurmukhi. Se distinguen singular `نتیجہ` y plural `نتیجے`. |
| `sw.json` | Kiswahili. Acciones imperativas, concordancia de nombres y distinción entre `tokeo` y `matokeo`; contenido humanitario y privacidad conservados. |
| `ha-Latn.json` | Hausa latino con letras `ƙ`, `ɗ` y `ɓ`. Se mantienen límites geográficos, acciones de recuperación y la distinción entre información histórica y predicción. `Sakamako` es válido como sustantivo de recuento en ambos mensajes. |
| `ru.json` | Ruso. Infinitivos en acciones y tratamiento formal en errores. Plural general con etiqueta `Результатов: {count}` para evitar concordancia incorrecta en los valores 2–4 y 5 o más. |

## Correcciones en la segunda pasada

1. La clave `query` es el título del panel que solicita una ficha, no el campo del buscador. Se corrigió de «texto de búsqueda» a petición de información en urdu, punyabí, suajili y hausa. Árabe y ruso ya expresaban «consulta/solicitud».
2. Se corrigió la forma plural punyabí de «nombres» a `ناواں` y se hizo explícito que las pequeñas localidades pueden estar ausentes **de la lista**, para que la frase no signifique que esas localidades simplemente permanecen.
3. El agente principal corrigió la coma decimal española del límite cartográfico a punto en árabe, urdu y punyabí; esta pasada hizo lo mismo en suajili y hausa. El ruso conserva su coma decimal. El valor sigue siendo 85,0511 grados; no cambia la cobertura del mapa.
4. Se unificó `Tsawon ƙasa` para longitud en las tres cadenas hausa relacionadas y se aclaró el contador compartido como un único contador para todos los visitantes. No se tradujo «cuota» como una cuota de pago.
5. Se revisaron los mensajes de plural con el contrato `countOne`/`countOther`. Árabe y ruso utilizan una etiqueta neutral en `countOther`, que conserva el significado sin requerir más claves. Ambos mensajes de cada catálogo mantienen exactamente un marcador `{count}`.
6. Se revisaron las fechas y las instituciones de las fichas: el evento de Beirut sigue siendo el 4 de agosto de 2020; las consecuencias nucleares se atribuyen al CICR, no a otro organismo.

## Comprobación técnica ejecutada

Se analizaron los seis JSON como UTF-8: 83 claves en cada uno, sin claves adicionales o ausentes, valores vacíos, carácter de sustitución Unicode ni marcadores de texto pendiente. No hay BOM. Los seis conservan `{count}` en sus dos mensajes de recuento. El catálogo `pnb-Arab` no contiene caracteres gurmukhi.

Comparación exacta con el español: no hay textos copiados accidentalmente. La única coincidencia en suajili y hausa es `Beirut, 2020`, que es el nombre propio y el año del evento; no indica una frase sin traducir.

## Formato punyabí y límites de esta revisión

Se revisó `lib/locale-format.ts`: sus nombres de meses de enero a diciembre son los de uso gregoriano habitual en shahmukhi. No representan el calendario tradicional punyabí. La alternativa numérica `ur-PK` con `arabext` aporta una convención de dígitos y agrupación explícita; el texto, los nombres de meses y el plural permanecen en punyabí. No se ha presentado esta alternativa como soporte nativo de `Intl` para `pnb-Arab`.

La lectura de catálogos no verifica por sí sola la composición bidi, los glifos dentro de MapLibre, el tamaño de los controles, la ausencia de recortes o el aspecto de cifras y enlaces en las ventanas de los navegadores. Esas comprobaciones corresponden a las pruebas de interfaz del agente principal. No se declara realizada una prueba visual por este revisor. Esta revisión por IA detecta problemas de sentido y concordancia concretos, pero no sustituye una revisión editorial nativa independiente ni certifica equivalencia jurídica del disclaimer.
