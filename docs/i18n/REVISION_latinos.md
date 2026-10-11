# Revisión lingüística de seis catálogos

Fecha: 11 de octubre de 2026. Bloque 2B del Sprint 2. Revisora identificada: agente IA Codex `/root/catalogos_latin`. Se realizaron una primera traducción y una segunda revisión semántica y terminológica de los 83 valores de cada catálogo, contrastándolos con `content/i18n/es.json`. Esta identificación no representa revisión humana, dominio nativo ni certificación profesional.

## Alcance y resultado

Se revisaron 498 valores en `fr.json`, `pt.json`, `de.json`, `id.json`, `vi.json` y `tr.json`: controles, etiquetas accesibles, categorías, errores y límites, contexto histórico, fuentes, información cartográfica, disclaimer y dos formas de recuento. Los seis catálogos tienen exactamente las 83 claves de la base española; no hay claves adicionales, vacías o ausentes. La validación ejecutada confirmó JSON válido, normalización Unicode NFC, ausencia de U+FFFD y conservación de `{count}` en ambos mensajes de recuento. No se modificaron identificadores, contratos, coordenadas, límites ni fechas históricas.

| Catálogo | Segunda revisión y decisiones |
| --- | --- |
| Francés `fr` | Concordancia, acciones completas y puntuación francesa. Beyrouth/Liban en el contexto; ONU y CICR con títulos traducidos. Se corrigió `viewReference`: «document» podía sugerir un archivo adjunto, por lo que se usa «fiche», consistente con el panel. Singular/plural: résultat/résultats. |
| Portugués `pt` | Redacción principalmente brasileña, comprensible para otros lectores de portugués: buscar, mouse, carregando. Coherencia de «localização», «ficha», «busca» y «cota». Beirute/Líbano y nombre institucional del Comitê Internacional da Cruz Vermelha, con sigla CICV. Concordancia resultado/resultados. |
| Alemán `de` | Tratamiento formal Sie, verbos de acción, compuestos y relaciones entre controles, tarjeta y mapa. «Eintrag» se usa para la ficha y «Bedienfeld» para el panel. Nombre institucional y sigla IKRK. Singular/plural: Ergebnis/Ergebnisse. |
| Indonesio `id` | Terminología bujur/lintang, peta/penanda, catálogo y estado de carga; frases completas sin calcar concordancias españolas. PBB para Naciones Unidas e ICRC para el proveedor institucional. El recuento usa «hasil» en ambas claves: no se fuerza una flexión singular/plural inexistente. |
| Vietnamita `vi` | Diacríticos compuestos normalizados, coordenadas kinh độ/vĩ độ y coherencia entre hồ sơ y vị trí. Fechas en orden vietnamita, nombre de Liên Hợp Quốc y título completo de Ủy ban Chữ thập đỏ Quốc tế. «kết quả» en ambas formas de recuento. |
| Turco `tr` | Revisión de caracteres ı/İ y ş/ğ, sufijos, enlem/boylam y registro de las acciones. Beyrut/Lübnan, BM e ICRC; categorías Askerî/Doğal. «sonuç» no cambia tras un numeral, por lo que ambas claves de recuento tienen la misma forma. |

`Mapa Táctico`, Sites, GeoNames, OpenStreetMap, WebGL2 y nombres de teclas se conservan como nombres propios o identificadores técnicos. Las siglas institucionales de Naciones Unidas y Cruz Roja se localizan cuando tienen un equivalente habitual; no se cambian enlaces ni proveedores. Los valores idénticos al español en portugués son vocablos compartidos correctamente traducidos (por ejemplo País, Consulta, Militar, Natural, Idioma y resultado), no textos pendientes. «Beirut, 2020» coincide con la base en alemán, indonesio y vietnamita porque conserva el topónimo publicado y el año.

## Límites de esta revisión

Esta entrega revisa los textos de seis catálogos; no certifica su representación en pantalla, el comportamiento del selector, el formato Intl, los glifos de MapLibre, la accesibilidad ni los veinte idiomas completos. Esas comprobaciones corresponden a la integración y a los criterios del bloque. La segunda revisión fue realizada por la misma IA en una pasada separada, no por una persona independiente. Puede existir una preferencia regional o estilística distinta; no se declara validación por hablantes nativos.
