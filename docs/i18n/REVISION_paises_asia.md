# Revisión de nombres geográficos: nueve idiomas

Fecha: 11 de octubre de 2026, America/Santo_Domingo. Sprint 2C. Revisor identificado: agente IA Codex `/root/catalogos_asia`. Revisión de los activos preparados por otro agente, con contraste contra las fuentes locales fijadas. No se declara revisión humana, certificación de hablante nativo ni autoridad toponímica.

Idiomas revisados: `zh-Hans`, `ja`, `hi`, `bn`, `mr`, `te`, `ar`, `ur`, `ru`. Activos inspeccionados: `content/geography/names.json`, `entities.json`, `manifest.json`, los nueve catálogos UI y las fuentes CLDR48 en `T:/tmp/mapa-tactico-idiomas`. Natural Earth: `T:/tmp/atlas-gazetteer/country-labels.geojson`, commit `ca96624a56bd078437bca8184e78163e5039ad19`.

## Contraste ejecutado

El conjunto cartográfico tiene 258 entidades: 239 con código de país y 19 excepciones Natural Earth. Cada idioma contiene 271 nombres al incluir los 13 componentes adicionales del catálogo. La comparación automatizada recorrió todos los 239 códigos y contrastó cada valor contra `main.<locale>.localeDisplayNames.territories` de su archivo CLDR48. No hubo diferencias, códigos cruzados ni claves ausentes en los nueve idiomas: 2151 asociaciones comprobadas.

Se recorrieron también las 19 excepciones por idioma, buscándolas por su `ADM0_A3` estable en Natural Earth. Se comparó el nombre con `NAME_ZH`, `NAME_JA`, `NAME_HI`, etc., o con el nombre fuente inglés cuando la traducción faltaba. Las 171 asociaciones coinciden con la fuente o su fallback deliberado. Maratí y telugu tienen fallback inglés explícito para las 19 excepciones; los otros siete idiomas lo tienen para `ne-PGA`. La identidad de cada entidad se conserva. La fidelidad a la fuente no garantiza que la traducción publicada por esa fuente sea correcta: los defectos visibles detectados figuran abajo.

Las sumas SHA-256 de los nueve archivos CLDR coinciden con `manifest.cldrHashes`. El SHA-256 de `names.json` coincide con `manifest.namesHash`. El hash de las entidades coincide con `manifest.entitiesHash` calculándolo sobre `JSON.stringify(entities)` compacto, tal como hace el generador; no se confunde con el hash del archivo con espacios. El hash Natural Earth coincide con `manifest.naturalEarthHash`:

`239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`.

Versión inspeccionada inicialmente: `countries-cldr48-ne20261011-20dc3231b201`. Tras resolver los ocho defectos, se volvió a comprobar la versión `countries-cldr48-ne20261011-957b5c556a06`, con SHA-256 de nombres `957b5c556a06d692a1d18a1a9e5ee4d1aab5de73ccec40efe6243b800fb62934`.

## Defectos visibles heredados de Natural Earth

Estas ocho entradas conservan correctamente la asociación geográfica, pero su nombre publicado tenía un defecto lingüístico o semántico. Se informó al coordinador, quien registró el rechazo de esos nombres en `scripts/preparar-paises.mjs` y regeneró los activos usando el nombre fuente inglés con fallback explícito. Esta tarea no modifica nombres, manifest ni código. Las propuestas de traducción de la tabla quedan como posibles overrides futuros y no se atribuyen a CLDR o Natural Earth.

| Idioma / entidad | Nombre inspeccionado | Defecto | Corrección lingüística propuesta si se utiliza override |
| --- | --- | --- | --- |
| zh-Hans / ne-SPI | `南巴塔哥尼亞冰原` | El carácter `亞` pertenece a la escritura tradicional; se pidió chino simplificado. | `南巴塔哥尼亚冰原` |
| zh-Hans / ne-IOA | `澳屬印度洋領地` | `屬` y `領` son tradicionales. | `澳属印度洋领地` |
| ar / ne-SPI | `قل الثلج الباتاغوني الجنوبي` | Falta la letra inicial de `حقل`; además, ice field se expresa con mayor precisión mediante hielo, no nieve. | `حقل الجليد الباتاغوني الجنوبي` |
| ur / ne-USG | `گونتاناموبے ناوال بسے` | Palabras pegadas y transliteración defectuosa de naval base. | `گوانتانامو بے کا امریکی بحری اڈہ` |
| ur / ne-BRI | `برازیلین آئی` | La palabra para isla quedó truncada; `آئی` no expresa island. | `برازیلی جزیرہ` |
| ur / ne-IOA | `آسْٹْریلِیَن انڈین اوشین تیریتورییس` | Transliteración inglesa poco legible y defectuosa, pudiendo expresarse el concepto directamente en urdu. | `بحر ہند کے آسٹریلوی علاقے` |
| bn / ne-USG | `গুয়ানতানামো বে কারাগার নৌবাহিনী বেস` | Añade `কারাগার` (prisión), que no forma parte de la entidad naval base; mezcla dos conceptos. | `গুয়ানতানামো উপসাগরে মার্কিন নৌঘাঁটি` |
| bn / ne-CLP | `ক্লিপারটন দ্বীপপুঞ্জ` | Usa archipiélago/plural para una entidad cuyo nombre fuente es Clipperton Island, singular. | `ক্লিপারটন দ্বীপ` |

**Resolución verificada:** se ejecutó una segunda comprobación sobre los ocho pares idioma/entidad. Cada nombre ahora coincide con `entities[].name` inglés y cada par aparece en `manifest.fallbacks`. Se verificaron nuevamente las 2151 asociaciones ordinarias CLDR de estos nueve idiomas, sin ningún cambio, el hash de nombres y los nueve fallbacks Spratly. Los ocho defectos quedan resueltos mediante fallback declarado, sin introducir traducciones inventadas ni alterar coordenadas.

No se detectó un error visible que requiera cambio en las restantes excepciones de japonés, hindi y ruso durante esta lectura. Esto no certifica que todo uso toponímico sea único ni oficial. En particular, transliteraciones y nombres alternativos publicados no se reemplazan por preferencias del revisor. Maratí y telugu conservan nombres fuente ingleses sin inventar traducciones para las excepciones.

`ne-PGA` representa **Spratly Islands**. Se comprobó el fallback deliberado: las traducciones Natural Earth de esa fila remiten erróneamente a Wake. Se conserva `Spratly Islands` y su fallback explícito en los nueve idiomas; no debe cambiarse a Wake ni asignarse otra identidad. El uso de nombres fuente y sus clasificaciones no añade una postura sobre soberanía.

## Revisión de la clave UI countryOriginal

Se leyó la nueva clave 84 de los nueve catálogos. Todas expresan que el nombre procede del catálogo original y que no hay traducción verificada, sin afirmar que el inglés sea el idioma escogido ni que los nombres oficiales de calles se traduzcan. No hay placeholders ni cambios de marca.

| Idioma | Resultado de lectura |
| --- | --- |
| zh-Hans | Simplificado correcto; distingue la grafía original y la ausencia de nombre traducido verificado. |
| ja | Construcción clara; `元のカタログの表記` explica la procedencia y `確認済みの訳名` la ausencia de revisión del nombre. |
| hi | Comprensible; conserva la distinción entre nombre fuente y traducción verificada. |
| bn | Comprensible; mantiene nombre fuente y ausencia de traducción verificada. |
| mr | Comprensible; expresa procedencia de la lista original y ausencia de traducción verificada. |
| te | Comprensible. Refinamiento opcional de naturalidad: `ఈ పేరు మూల జాబితాలో ఉన్నట్లుగానే ఉంచబడింది; ధృవీకరించిన అనువాదం అందుబాటులో లేదు.` No cambia el significado. |
| ar | Clara y gramatical; `كما ورد في الكتالوج الأصلي` conserva la forma fuente. |
| ur | Comprensible y coherente con el mensaje de fallback; sin sustitución silenciosa de idioma. |
| ru | Clara; expresa conservación del catálogo original y ausencia de traducción comprobada. |

## Límites

Esta tarea revisa asociaciones y texto de los activos, no ejecuta pruebas de navegador, composición de glifos, colisiones de etiquetas ni búsqueda interactiva. La integración debe demostrar que el aviso de fallback se ofrece para las entidades afectadas y que los cambios de idioma no cambian coordenadas o identificación. La revisión por IA está identificada; no sustituye una eventual revisión humana nativa. Los defectos heredados descritos no se ocultan bajo la coincidencia automatizada con la fuente.
