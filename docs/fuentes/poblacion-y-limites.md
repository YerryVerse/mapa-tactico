# Fuentes de población y límites administrativos

Revisión y manifiestos generados el 12 de octubre de 2026. Esta decisión se aplica al Sprint 3 y queda fijada para que las cifras no mezclen ediciones ni perímetros.

## Población

- Fuente: WorldPop Global 2, versión `R2025A v1`, año de referencia 2025, resolución 100 m y CRS WGS84 / EPSG:4326. El valor del raster representa personas por celda; no se multiplica de nuevo por la superficie. Los metadatos STAC registran NoData como `-99999`, tipo `float32` y compresión LZW.
- Tipo: estimación modelada de población distribuida espacialmente. No se presenta como censo oficial ni como conteo individual. La metodología redistribuye estimaciones administrativas con datos de asentamientos y covariables geográficas.
- Licencia: CC BY 4.0. Cita: Bondarenko et al. (2025), DOI [10.5258/SOTON/WP00839](https://doi.org/10.5258/SOTON/WP00839).
- Inventario consultado: el catálogo STAC devuelve 248 colecciones y un raster de población de 2025 a 100 m para 241 códigos. No hay archivo coincidente para `ATF`, `BVT`, `HMD`, `IOT`, `SGS`, `UMI` y `VAT`; estos casos no se convierten en cero habitantes.
- Consulta: `POST https://api.worldpop.org/v2/population`, seguida de `GET /v2/tasks/{task_id}`. La prueba anónima devolvió una suma real para el límite de Westminster. El proveedor publica 1.000 llamadas y un máximo de 50.000 km² por polígono sin clave. El proyecto limita su propio consumo a 600 llamadas por día y registra solo el contador global UTC en D1.
- Edición protegida: la respuesta solo se acepta si informa año 2025 y `worldpop_R2025A_2025_100m`. Una edición distinta, un HTML, un valor negativo, NaN o una respuesta sin área válida se trata como incompatibilidad o fallo. El servicio no publica un checksum de los GeoTIFF ni una proporción de celdas NoData por geometría; el manifiesto local tiene SHA-256 propio y el resultado informa el estado disponible del proveedor sin inventar un porcentaje de cobertura.

## Límites administrativos

- Proveedor separado del geocodificador: geoBoundaries, edición abierta `gbOpen`. La instantánea contiene 230 capas ADM0, 199 ADM1 y 180 ADM2; cada capa conserva su identificador estable, año representado, URL versionada, fuente y licencia original.
- `gbOpen` recomienda CC BY 4.0, pero la licencia puede variar por fuente original. Se conserva el campo de licencia de cada límite y se atribuye esa fuente en la ficha.
- Una unidad ADM no equivale automáticamente a una ciudad. La interfaz debe mostrar el nombre de la unidad, el nivel administrativo y el año del límite que el usuario eligió.

## Arquitectura de consulta y límites

- `GET /api/population/boundaries` solo consulta capas `ADM0`, `ADM1` y `ADM2` de `gbOpen`. La API devuelve el identificador estable de la capa y el elemento; no utiliza el geocodificador ni devuelve sugerencias de calles, direcciones o puntos de interés.
- `POST /api/population/admin` recibe únicamente esos dos identificadores. El servidor vuelve a cargar la capa fijada, resuelve el elemento por `shapeID`, valida su geometría y la envía al servicio de suma de WorldPop. El visitante no puede sustituirla por un perímetro distinto en esta ruta.
- `POST /api/population/area` conserva una geometría explícita para el futuro dibujo territorial. Valida tamaño, coordenadas, topología y países declarados antes de usar WorldPop.
- Esta arquitectura usa la suma geográfica externa de WorldPop y no descarga ni sube rasters; por ello `r2` se mantiene `null` y no se declara un decodificador de bloques. D1 solo guarda el contador global diario del proveedor. El catálogo versionado y sus instantáneas se mantienen en el código del proyecto.
- La API pública anónima de WorldPop admite hasta 50.000 km² por polígono. El servicio rechaza áreas mayores con `area_limit`; no las divide ni presenta una cifra parcial como total. Los países y unidades administrativas que superan el límite necesitan agregados preparados o un servicio externo con un límite acordado antes de habilitar su cálculo en la interfaz.

## Manifiestos e integridad

- `data/population/catalog.json` conserva inventario, resolución, unidades, NoData, extensión, tamaño, tipo de dato, compresión, DOI, URL y licencias, además de las capas administrativas. Incluye SHA-256 del manifiesto y de cada registro de datos.
- `data/population/service-catalog.json` es la parte acotada que importa el Worker. Se valida su SHA-256 antes de consultar.
- `node scripts/refresh-population-catalog.mjs` vuelve a consultar las fuentes y valida respuesta, edición, país, licencia y URL. Guarda primero una instantánea inmutable bajo el SHA-256 del catálogo, prepara archivos temporales y reemplaza atómicamente el catálogo que usa el Worker. La API de WorldPop realiza la suma; el Worker no almacena ni descarga rasters, y por eso no hay carga de GeoTIFF ni binding R2 en esta arquitectura. Una actualización futura puede restaurar el archivo versionado anterior.

## Pruebas reales del servicio

- Consulta directa a WorldPop con el polígono municipal de Westminster obtenido de geoBoundaries: población estimada `217.985,36`, área informada `22,9463 km²`, año 2025, `R2025A`, 100 m y 75 ms de procesamiento del proveedor. El límite está identificado por la capa `GBR-ADM2-9080712`, año representado 2019, y el elemento `shapeID=9080712B54935279696040`.
- La misma geometría se envió anónimamente al endpoint local del Worker en `http://127.0.0.1:5173/api/population/area`; devolvió el mismo total, área, año y fuente. La repetición fue atendida por caché y el contador D1 siguió en dos llamadas externas.
- El flujo administrativo local `GET /api/population/boundaries?countryCode=GBR&level=ADM2&q=Westminster` resolvió `GBR-ADM2-9080712` y `shapeID=9080712B54935279696040`; `POST /api/population/admin` devolvió el mismo total y el año de geometría 2019. Una búsqueda de `16 Main Street` devolvió `no_match`.
- Referencia de superficie independiente para esa geometría: GDAL mediante Rasterio 1.5.2 transformó WGS84 a EPSG:6933 y calculó el área proyectada por la fórmula del polígono. Dio `22,947662 km²`, frente a `22,9463 km²` en el Worker (diferencia relativa `0,00593 %`, dentro de la tolerancia técnica de `1 %`). Esta comparación comprueba la superficie, no una suma de población independiente: el total poblacional sigue siendo el resultado del proveedor WorldPop.
- Una geometría de referencia devolvió un total válido de cero en el proveedor. El portal conserva ese cero cuando WorldPop responde con un resultado válido y el catálogo tiene datos para el país indicado; no etiqueta el área como cobertura completa porque WorldPop no publica una fracción de celdas cubiertas.

## Referencias primarias

- [WorldPop Global 2](https://www.worldpop.org/blog/worldpop-global2-global-high-resolution-population-estimates-for-2015-2030/)
- [WorldPop REST API y metadatos](https://www.worldpop.org/sdi/introapi/)
- [WorldPop límites de la API anónima](https://www.worldpop.org/sdi/api_rate_limits/)
- [WorldPop STAC API](https://stac.worldpop.org/)
- [geoBoundaries API y licencias](https://www.geoboundaries.org/api.html)
