# ATLAS — Escenarios

Portal de Sites en desarrollo por sprints. Identidad conservada: appgprj_6aca23222ed881919537ddd318f39d79. URL: https://atlas-escenarios-hud.yerrybatista.chatgpt.site/. La audiencia actual es pública, sin cuentas ni claves de visitantes. El runtime publicado funciona en Sites y no depende de este computador.

## Estado real

Sprint1 en ejecución, bloque1A: migración TypeScript/React/Vinext, globo MapLibre6.13.0, estilo propio azul, calles vectoriales OpenFreeMap y fuentes para las20escrituras. Los controles completos, buscador y fichas se aceptan en1B/1C. Consultar estado y evidencias en docs/seguimiento/estado.json; no inferir finalización de este texto.

El prototipo D3 y sus porcentajes ficticios no forman parte de la nueva aplicación. Sus referencias de contexto se conservan en content/context.json; el recorrido de consulta se desarrolla en1C. La población real por área y catálogos completos pertenecen a sprints posteriores. Mantener el alcance documentado en el plan.

## Ejecutar y comprobar

Usar Node>=22.13.0 y el starter oficial de Sites. Dependencias fijadas y package-lock.json. Instalar con el helper oficial install-dependencies.mjs. Este host Windows necesita el entrypoint oficial de npm si su shim falla; ver docs/DECISION_CARTOGRAFICA.md. No modificar npm global ni la configuración del usuario.

- Desarrollo: npm run dev, URL127.0.0.1:5173. Regenera el worker oficial del paquete en public/map-worker.
- Verificación: npm run check y npm test. Las pruebas del seguimiento se ejecutan aparte con node tests/seguimiento-sprints.test.mjs.
- Build: helper oficial build-site.mjs. En este host: node scripts/sites-build-windows.mjs lo invoca con reparación del shim solo en su proceso.
- Vista compilada: npm start. Detener esa vista antes de reconstruir en Windows para liberar dist.
- Verificación técnica cartográfica: /qa/map, sin enlace en interfaz principal ni indexación. Solo para evidencia, fuera del flujo de usuarios.
- Seguimiento vivo: node scripts/seguimiento-sprints.mjs serve, URL127.0.0.1:4174/sprint-01.html.

## Publicar

Seguir la skill Sites y su site-workflow.mjs; conservar proyecto y audiencia. Las credenciales se pasan por stdin y nunca se guardan. El helper sincroniza fuente, empaqueta build y devuelve commit/archive verificados. En este Windows, el proceso debe seleccionar GitBash en T:/AI/Git/bin y TAR_OPTIONS=--force-local, evitando WSL y la interpretación del volumen T: como servidor remoto. No modificar PATH global. Publicar solo el estado fuente correspondiente al archivo generado.

Leer AGENTS.md, docs/PLAN_DE_SPRINTS.md, docs/REVISION_TECNICA_SPRINTS.md y docs/PROTOCOLO_DE_SPRINTS.md antes de trabajar. Solo el usuario aprueba el sprint y autoriza pasar al siguiente.
