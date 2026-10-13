# Fuentes de población y límites administrativos

Decisión de fuente del Sprint 3 elegida por el usuario el 12 de octubre de 2026: GeoTIFF oficiales de WorldPop, bloques verificables y almacenamiento R2. La aceptación humana del sprint permanece pendiente.

## Población

- Fuente: WorldPop Global 2, edición `R2025A-v1`, año de referencia 2025, resolución nominal de 100 m, CRS WGS84 / EPSG:4326, `float32` y NoData `-99999`. La unidad es personas por celda; el resultado no vuelve a multiplicarse por el área.
- Tipo: estimación modelada de población distribuida espacialmente, no un censo ni un conteo individual. La metodología redistribuye estimaciones administrativas con asentamientos y covariables geográficas.
- Licencia y cita: CC BY 4.0; Bondarenko et al. (2025), DOI [10.5258/SOTON/WP00839](https://doi.org/10.5258/SOTON/WP00839).
- Cobertura del catálogo: 241 de 248 países y territorios. No hay asset para `ATF`, `BVT`, `HMD`, `IOT`, `SGS`, `UMI` y `VAT`; esos códigos indican ausencia de cobertura, nunca cero habitantes.
- El servicio activo consulta exclusivamente el GeoTIFF fijado. La API pública de sumas de WorldPop queda fuera del camino de cálculo: la comparación de 2026 encontró diferencias entre ese servicio y el asset `CN` descargado, y su límite anónimo de 50.000 km² excluía países grandes.

## Límites administrativos

- Proveedor separado del geocodificador: geoBoundaries, edición abierta `gbOpen`. La instantánea fijada en `data/population/service-catalog.json` identifica 608 capas: 230 ADM0, 198 ADM1 y 180 ADM2. Cada capa mantiene código, identificador estable, año, URL, procedencia y referencia de licencia.
- Se retiró la entrada inconsistente `IND-ADM0-90661403`: declaraba nivel ADM1, pero su ID decía ADM0, contaba 1 unidad y repetía el GeoJSON de la capa ADM1 válida `IND-ADM1-1811400`, que contiene 36 unidades. India continúa sin ADM0 en la cobertura fijada. La actualización futura rechaza prefijos de nivel inconsistentes y fuentes duplicadas.
- De los 241 países y territorios con raster, 229 tienen al menos una capa geoBoundaries. No hay capas fijadas para `ALA`, `CCK`, `CXR`, `ESH`, `HKG`, `JEY`, `MAC`, `MAF`, `NFK`, `SJM`, `SPM` y `SXM`; además, `IND` y `PRI` no tienen ADM0 fijado. Estas ausencias constan en `boundaries.countryCoverage` de ambos catálogos y en el manifiesto preparado de cada país. No implican población cero: se pueden calcular geometrías dibujadas sobre el raster, pero no seleccionar unidades administrativas que no existen en el catálogo.
- `gbOpen` recomienda CC BY 4.0; la licencia puede variar por fuente original. Se conserva la atribución declarada por capa.
- Una unidad ADM no equivale automáticamente a una ciudad. La interfaz debe identificar nombre, nivel administrativo y año del límite seleccionado. El buscador solo publica países y ciudades; no añade calles, direcciones ni POI.
- `POST /api/population/admin` recibe identificadores de capa y elemento, resuelve el `shapeID` fijado y obtiene el agregado preparado. Una sugerencia geográfica no sustituye un perímetro administrativo.

## Preparación e integridad

- `data/population/catalog.json` conserva los 241 assets fijados, metadatos, tamaños, checksums STAC disponibles, DOI, licencia, límites, dimensiones y URLs. `data/population/service-catalog.json` es el manifiesto de ejecución acotado y se valida por SHA-256.
- `scripts/update-population-boundary-coverage.mjs` recalcula las listas de países con y sin capas sobre los catálogos ya fijados, verifica sus hashes de entrada y guarda instantáneas inmutables con los nuevos checksums; no consulta fuentes externas ni altera las URLs o los datos de origen. La actualización en línea del catálogo también incluye el mismo registro.
- `scripts/ingest-population-raster.mjs` descarga o reanuda la fuente oficial. `scripts/prepare-population-raster.py` convierte cada GeoTIFF al formato `MTPOP001`: bloques de 512 × 512, Float32 little-endian, máscara de validez explícita, compresión zlib e índice con offsets, tamaños y CRC-32. El manifiesto fija fuente, edición, NoData, estadísticas y SHA-256 de datos e índice.
- `scripts/verify-population-raster.py` compara cada valor y máscara preparados contra el GeoTIFF oficial. `scripts/prepare-population-admin-aggregates.py` valida geoBoundaries e identifica cada unidad por `shapeID`; suma celdas cuyo centro cae dentro del polígono y cuenta por separado celdas válidas y NoData. Usa agregados por bloque cuando el polígono cubre el bloque completo y rasteriza solo los bloques de borde. Lee bloques preparados con una caché limitada a 256, sin cargar el raster completo en el Worker.
- Las colecciones geoBoundaries que exceden 12 MB no se cargan completas en el Worker. `scripts/prepare-population-boundary-index.py` genera un índice versionado con nombres, identificadores, área geodésica y rangos de geometría de presentación en NDJSON; la selección lee solo la entidad necesaria desde R2. Si una geometría excede el presupuesto visual, la copia de presentación se simplifica y se marca como tal. El área y la suma administrativa se obtienen del perímetro oficial original y de sus agregados preparados, nunca de la geometría simplificada.
- Se tolera y corrige únicamente un exceso de redondeo de hasta `1e-9°` en los límites WGS84 (`±180°`, `±90°`); excesos mayores se rechazan como CRS incorrecto. Por ejemplo, el antimeridiano `180.0000000000001°` de geoBoundaries FJI se ajusta a `180°` sin envolver longitudes, cambiar el archivo fuente ni su SHA-256. El agregado y el índice usan esta geometría con el redondeo corregido.
- Los fragmentos administrativos y los objetos `data.bin`, `index.bin` y manifiesto llevan hashes verificables. La carga alojada usa partes reanudables e idempotentes; la activación cambia el puntero publicado solo después de verificar las 241 fuentes y sus agregados. El portal público no recibe secretos de carga.
- `.openai/hosting.json` enlaza el Worker con D1 (`DB`) y R2 (`BUCKET`). La migración local `0002_unknown_franklin_richards.sql` ya creó las tablas de carga. El D1 alojado, la carga completa a R2 y la activación aún requieren verificación.
- Estado de preparación local observado: GBR, AFG, DEU y ESP tienen fuente descargada, bloques verificados y tres niveles de agregados. ESP: 393 bloques, 72 unidades y 3 capas. La ingesta completa de los 241 países sigue en curso; estos ejemplos no equivalen a cobertura global activada.

## Pruebas reales y metodología

- Westminster (GBR), límite `GBR-ADM2-9080712`, elemento `shapeID=9080712B54935279696040`, fue calculado con WorldPop `R2025A-v1` a 100 m mediante celdas cuyo centro está dentro del polígono. El servicio raster y una suma independiente con Rasterio dieron `206027.97752704192` en `4103` celdas; diferencia relativa `0 %`. La ruta administrativa local respondió HTTP 200, usó dos lecturas de rango y midió aproximadamente 100–133 ms en las pruebas ejecutadas.
- El caso real confirma el decoder, el acceso por rango y el agregado administrativo en el runtime local con R2/D1 de prueba. No prueba aún el Worker alojado ni el bucket R2 publicado; la aceptación de esos puntos depende de la migración y carga reales.
- En la evaluación histórica de la API externa, WorldPop devolvió `217985.36` para Westminster. Una suma previa de celdas que tocaban el límite dio `215417.2741`; el método actual de centro de celda da `206027.977527`. Son reglas de selección distintas. La API externa no identifica el checksum del asset `CN` y su resultado no se usa para afirmar equivalencia con el raster oficial.
- El GeoTIFF oficial de GBR pesa 86.986.169 bytes y su SHA-256 es `98a640f18c7f54ef647f766f7e4fb52a3938659f7e699ef71fe870727636240a`. El verificador comparó todos sus bloques con la fuente.
- La suma declarada de los 241 GeoTIFF de origen es aproximadamente 9,51 GiB; el almacenamiento final de bloques y agregados se medirá al terminar la preparación. Los valores y cifras mostrados no implican precisión de población calle por calle.

## Referencias primarias

- [WorldPop Global 2](https://www.worldpop.org/blog/worldpop-global2-global-high-resolution-population-estimates-for-2015-2030/)
- [WorldPop STAC API](https://stac.worldpop.org/)
- [WorldPop REST API y límites anónimos](https://www.worldpop.org/sdi/introapi/)
- [geoBoundaries API y licencias](https://www.geoboundaries.org/api.html)
