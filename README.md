# ATLAS — Simulador de escenarios

Sitio educativo de una sola página con globo interactivo, estética HUD azul `#003876` y componentes blancos. Publicación privada mediante Sites.

## Uso

Arrastrar el globo para girarlo; usar la rueda o los botones para acercar. Pulsar el mapa para colocar un punto y seleccionar uno de cinco escenarios. El botón **Detonar escenario** muestra una animación simbólica y un ejercicio con comunidad ficticia. Las flechas giran el globo, `+`/`-` cambian el acercamiento y `Enter` coloca un punto en el centro.

## Alcance del ejercicio

El sitio no calcula bajas reales. El mapa no consulta población, objetivos ni censos. Todos los escenarios comparten porcentajes arbitrarios de juego, independientes del tipo de evento y de las coordenadas: 8 %, 16 % o 24 % de unidades afectadas según preparación; 10 % de las unidades afectadas se muestran como fallecidas ficticias. No son tasas predictivas. Los anillos carecen de escala física y no modelan armas, explosiones, radiación, presión o distancias reales.

## Archivos y ejecución

`dist/` contiene todos los activos para publicar. Ejecutar `node preview.mjs` y abrir `http://127.0.0.1:4173`. No se requieren instalación de dependencias ni compilación. `node prepare-assets.mjs` vuelve a descargar las versiones fijadas de los activos cartográficos.

## Fuentes

- Cartografía: Natural Earth (dominio público), empaquetada por world-atlas 2.0.2.
- Visualización: D3 7.9.0 (ISC), topojson-client 3.1.0 (ISC). Las licencias se incluyen en `dist/assets/`.
- Contexto Beirut: https://apnews.com/article/415b95004a8e914ce53400900fa7392a
- Contexto humanitario nuclear: https://www.icrc.org/en/article/faq-nuclear-weapons

Los activos de ejecución se sirven localmente desde el sitio. Los enlaces externos son exclusivamente lecturas de contexto.
