# Formatos hausa sin datos Intl del navegador

11 de octubre de 2026. Revisor identificado: IA Codex `/root`, esta conversación. Revisión de formatos y de la integración del catálogo ha-Latn; no se atribuye certificación humana.

La reverificación del Sprint2 en IAB Chrome155 mostró que `supportedLocalesOf(['ha'])` devuelve cero para NumberFormat y DateTimeFormat, aunque PluralRules sí tiene datos. La alternativa anterior cambiaba ha-Latn a ha, pero lanzaba una excepción en este entorno. Las pruebas anteriores en Node no reproducían esa ausencia.

Fuentes fijas, redistribuidas bajo la licencia Unicode-3.0 ya incluida en public/licenses/CLDR-48.txt:

- [CLDR JSON48 · calendario ha](https://raw.githubusercontent.com/unicode-org/cldr-json/48.0.0/cldr-json/cldr-dates-full/main/ha/ca-gregorian.json): doce nombres de meses gregorianos y patrón largo `d MMMM, y`.
- [CLDR JSON48 · números ha](https://raw.githubusercontent.com/unicode-org/cldr-json/48.0.0/cldr-json/cldr-numbers-full/main/ha/numbers.json): numerales latn, punto decimal, coma de agrupación, patrón decimal `#,##0.###`.

Se contrastó cada uno de los doce meses del array de lib/locale-format.ts con la fuente. La fecha queda siempre en hausa, calendario gregoriano y UTC. El formato decimal de respaldo en-US corresponde a los símbolos, agrupación y numerales publicados por CLDR ha para las cantidades decimales utilizadas en el portal; no se usa para traducir fechas, unidades o frases. Las unidades proceden del catálogo propio. Una regla uno/otros explícita cubre también navegadores sin reglas de plural ha. El catálogo ha-Latn y sus nombres de países permanecen inalterados.

La prueba de regresión bloquea NumberFormat/DateTimeFormat/PluralRules para ha y comprueba 12,345.67, coordenada negativa, cambio de día UTC, enero/octubre en hausa, unidad km y frases completas para uno/ocho resultados. Se restauran los mocks al terminar. La nueva batería contiene 41 pruebas.
