import { readFile, writeFile, mkdir, stat, rename } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const folder = path.join(root, 'docs', 'seguimiento');
const statePath = path.join(folder, 'estado.json');
const planPath = path.join(root, 'docs', 'PLAN_DE_SPRINTS.md');
const portal = 'https://atlas-escenarios-hud.yerrybatista.chatgpt.site/';
const command = process.argv[2] || 'help';
const args = Object.fromEntries(process.argv.slice(3).reduce((pairs, token, i, tokens) => {
  if (token.startsWith('--')) pairs.push([token.slice(2), tokens[i + 1]]);
  return pairs;
}, []));
const now = () => new Date().toISOString();
const hash = text => createHash('sha256').update(text).digest('hex');
function contextHashForAcceptance(plan, firstSprint, commonContracts) {
  const previousLegend = 'Verde con letras blancas: terminado y verificado; naranja: en curso; rojo con letras blancas: no completado, fallo o bloqueo; sin relleno y letras negras: pendiente.';
  const previousRows = 'Las filas «Terminado» tienen fondo verde y letras blancas; las filas «No completado», fondo rojo y letras blancas; las filas «Pendiente», sin relleno y letras negras. Las filas «En curso» conservan fondo naranja y texto negro.';
  const previousMeaning = 'verde significa terminado y comprobado con evidencia; naranja significa en curso; rojo significa intento no completado, fallo o bloqueo; sin relleno y texto negro significa pendiente.';
  const previousTemplate = 'verde con letras blancas para terminado y verificado con evidencia, naranja para en curso, rojo con letras blancas para no completado, fallo o bloqueo y sin relleno con letras negras para pendiente.';
  const normalizeDisplay = text => text
    .replace(/Verde con letras blancas: terminado y verificado; naranja(?: con letras blancas)?: (?:en curso|pendiente o en curso); rojo con letras blancas: no completado, fallo o bloqueo\./g, previousLegend)
    .replace(/Las filas «Terminado» tienen fondo verde y letras blancas; las filas «No completado», fondo rojo y letras blancas; las filas «Pendiente» y «En curso», fondo naranja y letras blancas\./g, previousRows)
    .replace(/verde significa terminado y comprobado con evidencia; naranja significa pendiente o en curso; rojo significa intento no completado, fallo o bloqueo\./g, previousMeaning)
    .replace(/verde con letras blancas para terminado y verificado con evidencia; naranja con letras blancas para pendiente o en curso; rojo con letras blancas para no completado, fallo o bloqueo\./g, previousTemplate);
  const context = normalizeDisplay(plan.slice(0, firstSprint).replace(/^Revisión técnica:.*$/m, '') + plan.slice(commonContracts));
  return hash(context);
}
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonInline = value => JSON.stringify(value).replace(/</g, '\\u003c');
const labels = { pendiente: 'Pendiente', en_curso: 'En curso', terminado: 'Terminado', no_completado: 'No completado' };
const phaseLabels = { pendiente: 'Pendiente', en_curso: 'En curso', esperando_aprobacion: 'Esperando aprobación', aprobado: 'Aprobado por el usuario' };

const guides = {
  1: [
    ['Abrir el portal en ventanas amplias y estrechas.', 'El mapa ocupa la pantalla; solo flotan controles útiles. No hay nombre, logo, cabecera ni tarjetas de resultados iniciales.'],
    ['Acercar hasta una calle de Santo Domingo y luego recuperar la vista global.', 'Se ven nombres de calles, sin satélite ni iconos o etiquetas de comercios. El globo puede llenar la pantalla. La evidencia técnica documenta la escala de 5 metros.'],
    ['Buscar una ciudad con nombre repetido, elegirla y seleccionar una ubicación.', 'Las sugerencias permiten distinguirla; arrastrar el mapa no coloca un punto.'],
    ['Abrir y cerrar configuración y una ficha disponible; repetir con teclado.', 'Solo aparecen paneles solicitados, el foco regresa y se conservan ubicación y zoom. No quedan población ficticia ni cifras arbitrarias.']
  ],
  2: [
    ['Abrir el selector de idioma y comprobar sus veinte opciones.', 'Los idiomas se identifican por nombres nativos, sin banderas; todos son seleccionables.'],
    ['Cambiar entre español, inglés, árabe, hindi y chino con una ubicación elegida.', 'Cambian interfaz y nombres de países; ubicación y resultado vigente permanecen. No hay glifos vacíos ni texto recortado.'],
    ['Elegir árabe, urdu o punyabí occidental y recorrer los controles.', 'Paneles y texto tienen dirección correcta; coordenadas y cifras son legibles. El mapa mantiene su orientación geográfica.'],
    ['Elegir un idioma manualmente y volver a abrir el portal.', 'Se conserva la elección manual válida. Sin preferencia guardada se carga English desde el primer renderizado, independientemente del idioma del navegador.']
  ],
  3: [
    ['Buscar una ciudad y abrir su consulta poblacional.', 'El total identifica año, fuente y perímetro; no se confunde una coordenada central con los límites de la ciudad.'],
    ['Dibujar un área, consultar población y modificarla.', 'El resultado corresponde al área vigente y conserva unidad, resolución y cobertura. Una respuesta anterior no reemplaza la nueva consulta.'],
    ['Consultar un área sin cobertura o que exceda los límites documentados.', 'Hay una explicación y recuperación pertinente; un fallo o ausencia de datos no aparece como cero habitantes.'],
    ['Cerrar la consulta y volver a explorar.', 'Se conserva la navegación y no quedan capas de otra consulta. El total se identifica como población, no como víctimas.']
  ],
  4: [
    ['Abrir Accidente y consultar gas doméstico, gas industrial y Beirut.', 'Las tres entradas están completas y diferenciadas, con información y fuentes pertinentes.'],
    ['Abrir el caso Beirut y consultar su ubicación y registros.', 'Fecha, lugar y víctimas históricas corresponden al acontecimiento original; no cambian al mover el punto libre.'],
    ['Consultar el contexto territorial disponible y cambiar de caso.', 'Población y registros históricos conservan etiquetas y fechas; se limpian capas previas y no se inventan cifras de víctimas.'],
    ['Cerrar y reabrir la consulta en ventanas estrechas y en otro idioma.', 'El flujo es utilizable, conserva la selección necesaria y no muestra resultados vacíos.']
  ],
  5: [
    ['Abrir Natural y consultar los dos fenómenos documentados elegidos.', 'Incluye una erupción y otro fenómeno natural, con fichas y fuentes propias.'],
    ['Abrir el caso con geometría publicada y consultar población en su área.', 'La capa coincide con su fuente y fecha; población corresponde al área y edición indicadas.'],
    ['Cambiar de fenómeno y cerrar el panel.', 'Cada fenómeno usa sus capas pertinentes, sin círculos de explosión idénticos ni restos del caso anterior.'],
    ['Consultar fuentes y repetir la lectura en otro idioma.', 'Se conservan los hechos y no se presenta un registro histórico como un aviso actual.']
  ],
  6: [
    ['Abrir Militar y consultar un caso convencional y uno nuclear históricos.', 'Hay al menos un caso completo de cada tipo con lugar, fecha, datos y fuentes.'],
    ['Mover la cámara o seleccionar otro punto libre mientras se consulta un caso.', 'Los hechos y víctimas históricas siguen vinculados al lugar original.'],
    ['Abrir sus detalles, cambiar de caso y regresar al mapa.', 'Las capas se limpian, los controles funcionan y el contexto humanitario es accesible.'],
    ['Consultar el módulo en ventanas estrechas y en otro idioma.', 'La misma información permanece legible y no aparece un cálculo de daño o bajas de un ataque en el punto libre.']
  ],
  7: [
    ['Abrir la sección Tierra y consultar diámetro, gravedad, masa y composición.', 'Cada cifra tiene unidad, definición y fuente; se distinguen medidas medias de otras referencias.'],
    ['Abrir la explicación de HAARP y sus fuentes.', 'Se puede seguir la evidencia y distinguir observaciones de interpretaciones.'],
    ['Consultar al menos tres pruebas subterráneas de dos países.', 'Hay fichas documentadas y eventos coherentes con el catálogo; se distingue sismicidad registrada de conclusiones generales.'],
    ['Revisar las comparaciones y volver al mapa.', 'La escala terrestre no se usa para afirmar que no puede existir daño local; no quedan paneles o marcadores sobrantes.']
  ],
  8: [
    ['Revisar las propuestas antes de elegir un nombre.', 'Se muestran significado, pronunciación, escrituras comprobadas y coincidencias relevantes. La elección corresponde al usuario.'],
    ['Una vez aplicada la opción elegida, abrir el portal en ventanas estrechas y amplias.', 'No hay nombre ni icono flotantes sobre el mapa; la identidad permanece en la pestaña y las vistas de información solicitadas.'],
    ['Revisar título de pestaña, favicon, menú, información y disclaimer en varios idiomas.', 'La identidad aprobada es consistente y no quedan referencias provisionales accidentales.'],
    ['Comprobar la dirección y el acceso del portal.', 'Se mantiene el mismo proyecto y audiencia; cualquier dirección nueva responde a la decisión aprobada.']
  ],
  9: [
    ['Abrir Materiales y consultar las fichas de propano y uranio.', 'Se identifica material, proceso, unidad, condiciones y fuente; ambos están terminados.'],
    ['Usar la comparación visual y consultar los valores en tabla.', 'Las bases de comparación son compatibles; una escala logarítmica se identifica y existe lectura accesible.'],
    ['Recorrer la explicación de masa y energía.', 'Se distingue masa del sistema, diferencia de masa, material que participa y energía liberada; no se afirma que todo el material desaparece.'],
    ['Consultar la participación del material y el reparto de energía.', 'No se mezclan eficiencia y consumo ni aparecen porcentajes universales inventados o un cálculo de rendimiento de armas.'],
    ['Repetir el recorrido con teclado, ventanas estrechas y otro idioma.', 'Gráficos, unidades, leyendas y tablas conservan su significado y son utilizables.']
  ],
  10: [
    ['Abrir la versión entregada y recorrer mapa, búsqueda y selector de idiomas.', 'Las funciones aceptadas siguen operativas en ventanas estrechas y amplias; carga y navegación cumplen los presupuestos documentados.'],
    ['Consultar una ciudad, dibujar un área y explorar las tres categorías.', 'Datos, fuentes, fechas y capas conservan coherencia; no se muestran respuestas antiguas ni paneles vacíos permanentes.'],
    ['Abrir Tierra y Materiales, revisar identidad y disclaimer.', 'Las secciones mantienen los veinte idiomas, el alcance y los contenidos aceptados.'],
    ['Revisar versión, incidencias y guía de mantenimiento y recuperación.', 'Se identifica la entrega exacta, cómo actualizar fuentes y cómo recuperar código y datos de manera compatible.'],
    ['Abrir el dominio publicado sin sesión iniciada y consultar sus API.', 'El acceso es público, sin cuentas, registro, inicio de sesión, contraseñas ni claves del visitante. Se conserva el mismo proyecto Sites.']
  ]
};

async function writeChanged(file, content) {
  const old = await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (old === content) return false;
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp';
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, file);
  return true;
}

function parsePlan(plan) {
  const matches = [...plan.matchAll(/^## Sprint (\d+) (.+)$/gm)];
  if (matches.length !== 10 || matches.some((match, index) => Number(match[1]) !== index + 1)) throw new Error('El plan debe contener diez sprints únicos y ordenados del 1 al 10.');
  return matches.map((match, index) => {
    const number = Number(match[1]);
    const next = matches[index + 1]?.index ?? plan.indexOf('\n## Contratos comunes', match.index);
    const section = plan.slice(match.index, next < 0 ? plan.length : next);
    let group = null;
    let acceptanceIndex = 0;
    let acceptanceSection = false;
    let lastPoint = null;
    const points = [];
    for (const line of section.split(/\r?\n/)) {
      const heading = /^### (.+)$/.exec(line);
      if (heading) { group = heading[1]; acceptanceSection = false; acceptanceIndex = 0; lastPoint = null; }
      const block = /^Bloque (\d+[A-Z]) /.exec(group ?? '');
      const acceptanceHeading = /^#### Criterios de aceptación del bloque (\d+[A-Z])$/.exec(line);
      if (acceptanceHeading) {
        if (!block || block[1] !== acceptanceHeading[1]) throw new Error(`Criterios fuera de su bloque: ${line}`);
        acceptanceSection = true;
        lastPoint = null;
      }
      const operation = /^(\d+)\. (.+)$/.exec(line);
      const acceptance = /^- (.+)$/.exec(line);
      if (block && operation && !acceptanceSection) points.push({ id: `S${String(number).padStart(2, '0')}-${block[1]}-${operation[1].padStart(2, '0')}`, blockId: block[1], group, text: operation[2], kind: 'operacion' });
      if (block && acceptanceSection && acceptance) points.push({ id: `S${String(number).padStart(2, '0')}-${block[1]}-AC-${String(++acceptanceIndex).padStart(2, '0')}`, blockId: block[1], group, text: acceptance[1], kind: 'aceptacion' });
      if (block && (operation && !acceptanceSection || acceptance && acceptanceSection)) lastPoint = points.at(-1);
      else if (block && lastPoint && /^\s{2,}\S/.test(line)) lastPoint.text += ' ' + line.trim();
    }
    if (!points.length) throw new Error(`Sprint ${number} sin operaciones.`);
    if (new Set(points.map(point => point.id)).size !== points.length) throw new Error(`Sprint ${number} con identificadores de puntos duplicados.`);
    for (const id of new Set(points.map(point => point.blockId))) {
      if (!points.some(point => point.blockId === id && point.kind === 'aceptacion')) throw new Error(`Bloque ${id} sin criterios de aceptación.`);
    }
    return { number, title: match[2].trim(), points };
  });
}

async function sync() {
  const plan = await readFile(planPath, 'utf8');
  const old = await readFile(statePath, 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  const stamp = now();
  const firstSprint = plan.indexOf('## Sprint 1 ');
  const commonContracts = plan.indexOf('## Contratos comunes');
  if (firstSprint < 0 || commonContracts < 0) throw new Error('Faltan sprints o contratos comunes.');
  const contextHash = contextHashForAcceptance(plan, firstSprint, commonContracts);
  let firstAffected = old?.contextHash && old.contextHash !== contextHash ? 1 : null;
  const affectedBlockRanks = new Map();
  const sprints = parsePlan(plan).map(source => {
    const previous = old?.sprints.find(s => s.number === source.number);
    const blockOrder = new Map([...new Set(source.points.map(point => point.blockId))].map((blockId, index) => [blockId, index]));
    let changed = false;
    let firstChangedBlockRank = Number.POSITIVE_INFINITY;
    const points = source.points.map(point => {
      const found = previous?.points.find(p => p.id === point.id) ?? (point.kind === 'aceptacion' ? previous?.points.find(p => p.kind === 'aceptacion' && p.text === point.text) : null);
      if (found && found.text === point.text) return { ...found, ...point };
      changed ||= Boolean(previous);
      if (previous) firstChangedBlockRank = Math.min(firstChangedBlockRank, blockOrder.get(point.blockId) ?? 0);
      return { ...point, status: 'pendiente', evidence: '', updatedAt: stamp, history: found ? [...found.history, { at: stamp, status: 'pendiente', evidence: 'Cambió el requisito en el plan; necesita nueva verificación.' }] : [] };
    });
    const currentIds = new Set(source.points.map(point => point.id));
    for (const point of previous?.points ?? []) if (!currentIds.has(point.id)) firstChangedBlockRank = Math.min(firstChangedBlockRank, blockOrder.get(point.blockId) ?? 0);
    changed ||= Boolean(previous && previous.points.length !== points.length);
    if (changed) {
      const affectedRank = Number.isFinite(firstChangedBlockRank) ? firstChangedBlockRank : 0;
      affectedBlockRanks.set(source.number, affectedRank);
      firstAffected = Math.min(firstAffected ?? source.number, source.number);
      for (const point of points.filter(p => p.kind === 'aceptacion' && p.status === 'terminado' && (blockOrder.get(p.blockId) ?? 0) >= affectedRank)) {
        point.status = 'pendiente';
        point.evidence = 'Reverificar: cambiaron los requisitos del sprint.';
        point.updatedAt = stamp;
        point.history.push({ at: stamp, status: 'pendiente', evidence: point.evidence });
      }
    }
    return {
      number: source.number, title: source.title, updatedAt: changed ? stamp : previous?.updatedAt ?? stamp,
      phase: changed ? 'pendiente' : previous?.phase ?? 'pendiente',
      approval: changed ? { status: 'pendiente', at: null, reference: null } : previous?.approval ?? { status: 'pendiente', at: null, reference: null },
      delivery: changed ? null : previous?.delivery ?? null,
      reviewSteps: previous?.reviewSteps?.map(step => source.number === 8 && step.expected === 'Nombre e icono flotan, son legibles y no crean una cabecera ni reducen el mapa.' ? { action: guides[8][1][0], expected: guides[8][1][1] } : step.expected === 'La versión publicada conserva proyecto, audiencia y credenciales; no se ha abierto acceso anónimo sin autorización.' ? { action: guides[10].at(-1)[0], expected: guides[10].at(-1)[1] } : step) ?? guides[source.number].map(([action, expected]) => ({ action, expected })),
      history: previous?.history ?? [], points
    };
  });
  if (firstAffected !== null) {
    for (const sprint of sprints.filter(s => s.number >= firstAffected)) {
      const previous = old?.sprints.find(s => s.number === sprint.number);
      if (!previous) continue;
      const blockOrder = new Map([...new Set(sprint.points.map(point => point.blockId))].map((blockId, index) => [blockId, index]));
      const affectedRank = sprint.number === firstAffected ? affectedBlockRanks.get(sprint.number) ?? 0 : 0;
      for (const point of sprint.points.filter(p => p.kind === 'aceptacion' && p.status === 'terminado' && (blockOrder.get(p.blockId) ?? 0) >= affectedRank)) {
        point.status = 'pendiente';
        point.evidence = `Reverificar: cambiaron los requisitos o contratos desde el sprint ${firstAffected}.`;
        point.updatedAt = stamp;
        point.history.push({ at: stamp, status: 'pendiente', evidence: point.evidence });
      }
      sprint.phase = 'pendiente';
      sprint.updatedAt = stamp;
      sprint.delivery = null;
      sprint.approval = { status: 'pendiente', at: null, reference: null };
      sprint.history.push({ at: stamp, action: 'aceptacion_invalidada', reference: `Cambio de requisitos o contratos desde el sprint ${firstAffected}; verificar de nuevo antes de continuar.` });
    }
  }
  const planVersion = Number(/Revisión técnica: versión (\d+) del plan/.exec(plan)?.[1]);
  const controlSection = /## Documento de control del cumplimiento\r?\n([\s\S]*?)(?=\r?\n## |$)/.exec(plan)?.[1];
  const controlRules = [...(controlSection ?? '').matchAll(/^\d+\. (.+)$/gm)].map(match => match[1].trim());
  const controlScope = /^Alcance web vigente:.*$/m.exec(controlSection ?? '')?.[0]?.trim() ?? '';
  const liveWorkflow = /^Supervisión en vivo:.*$/m.exec(plan)?.[0]?.trim() ?? '';
  if (!Number.isInteger(planVersion) || planVersion < 1 || controlRules.length !== 10) throw new Error('Faltan la versión del plan o sus diez reglas de control.');
  const result = { schemaVersion: 1, planVersion, controlRules, controlScope, liveWorkflow, planHash: hash(plan), contextHash, project: 'Mapa Táctico', portal, updatedAt: old?.updatedAt ?? stamp, sprints };
  if (!old || JSON.stringify({ ...result, updatedAt: null }) !== JSON.stringify({ ...old, updatedAt: null })) result.updatedAt = stamp;
  for (const sprint of result.sprints) {
    const previous = old?.sprints.find(s => s.number === sprint.number);
    if (previous && previous.phase !== sprint.phase && sprint.phase === 'pendiente') sprint.history.push({ at: stamp, action: 'requisito_modificado', reference: 'Plan actualizado; revisión y aprobación anteriores retiradas.' });
  }
  await save(result);
  console.log(`Sincronizados ${sprints.length} sprints y ${sprints.reduce((sum, s) => sum + s.points.length, 0)} puntos. Estados y evidencias conservados donde siguen vigentes.`);
}

async function restoreDisplayOnlyInvalidation() {
  const [plan, state] = await Promise.all([
    readFile(planPath, 'utf8'),
    readFile(statePath, 'utf8').then(JSON.parse)
  ]);
  const firstSprint = plan.indexOf('## Sprint 1 ');
  const commonContracts = plan.indexOf('## Contratos comunes');
  const displayOnlyChange = plan.includes('Revisión técnica: versión 22 del plan') && plan.includes('Este ajuste administrativo no modifica los requisitos funcionales del portal ni requiere repetir su aceptación.');
  const sitesClarification = plan.includes('Revisión técnica: versión 26 del plan') && plan.includes('El runtime y los bindings D1/R2 de producción los administra OpenAI Sites; el portal publicado no exige que el usuario aloje u opere servidores, bases de datos, buckets ni instalaciones.');
  if (firstSprint < 0 || commonContracts < 0 || (!displayOnlyChange && !sitesClarification)) {
    throw new Error('La recuperación solo aplica a cambios administrativos documentados y con contexto funcional sin cambios.');
  }
  const unchangedContext = contextHashForAcceptance(plan, firstSprint, commonContracts);
  const priorContextHash = '3f0488730cc8487553295c934da319ca54b6637532839fefebf45d9ccd4ba0cc';
  if (unchangedContext !== priorContextHash) throw new Error('El contexto funcional también cambió; no se restaurarán aprobaciones automáticamente.');

  const invalidationEvents = state.sprints.filter(item => item.number <= 2).map(sprint => [...sprint.history].reverse().find(event => event.action === 'aceptacion_invalidada'));
  const invalidationAt = invalidationEvents[0]?.at;
  if (!invalidationAt || invalidationEvents.some(event => event?.at !== invalidationAt)) throw new Error('Los sprints 1 y 2 no comparten la misma invalidación administrativa más reciente.');
  const sprintOneEvidence = await readFile(path.join(root, 'docs', 'REVERIFICACION_SPRINT_02.md'), 'utf8');
  const sourceHash = /Producto: Sites24, SHA `([^`]+)`/.exec(sprintOneEvidence)?.[1];
  const sprintTwoAcceptance = await readFile(path.join(root, 'docs', 'ACEPTACION_SPRINT_02.md'), 'utf8');
  const published = /Entrega vigente \*\*Sites24\*\*: (https?:\/\/[^\s]+)\. Fuente `([^`]+)`, versión `([^`]+)`/.exec(sprintTwoAcceptance);
  if (!sourceHash || !published) throw new Error('No se encontró la URL y la versión publicadas para restaurar la referencia de entrega.');

  const stamp = now();
  for (const sprint of state.sprints.filter(item => item.number <= 2)) {
    const lastApproval = [...sprint.history].reverse().find(event => event.action === 'approve' && event.reference);
    const invalidation = [...sprint.history].reverse().find(event => event.action === 'aceptacion_invalidada');
    const laterReopen = sprint.history.some(event => ['reabierto', 'reject'].includes(event.action) && event.at > lastApproval?.at && event.at < invalidation?.at);
    if (sprint.phase !== 'pendiente' || !lastApproval || !invalidation || invalidation.at !== invalidationAt || lastApproval.at >= invalidation.at || laterReopen) {
      throw new Error(`Sprint ${sprint.number} no cumple las condiciones de una invalidación administrativa corregible.`);
    }
    for (const point of sprint.points) {
      if (point.kind === 'operacion') {
        if (point.status !== 'terminado' || !point.evidence.trim()) throw new Error(`Sprint ${sprint.number}: la operación ${point.id} no conserva su verificación.`);
        continue;
      }
      if (point.status !== 'pendiente' || !point.evidence.startsWith('Reverificar: cambiaron los requisitos o contratos')) throw new Error(`Sprint ${sprint.number}: el criterio ${point.id} tiene un estado distinto al de la invalidación visual.`);
      const priorVerification = [...point.history].reverse().find(event => event.status === 'terminado' && event.evidence?.trim() && Date.parse(event.at) <= Date.parse(lastApproval.at));
      if (!priorVerification) throw new Error(`Sprint ${sprint.number}: falta evidencia histórica del criterio ${point.id}.`);
      point.status = 'terminado';
      point.evidence = priorVerification.evidence;
      point.updatedAt = priorVerification.at;
    }
    const priorReview = [...sprint.history].reverse().find(event => event.action === 'review' && Date.parse(event.at) <= Date.parse(lastApproval.at));
    if (!priorReview) throw new Error(`Sprint ${sprint.number}: falta la revisión de entrega anterior a su aprobación.`);
    sprint.phase = 'aprobado';
    sprint.approval = { status: 'aprobado', at: lastApproval.at, reference: lastApproval.reference };
    sprint.delivery = sprint.number === 1
      ? { url: portal, version: `Sites24 · fuente ${sourceHash} · sin marcador automático · revisión aprobada de Sprint 1`, preparedAt: priorReview.at }
      : { url: published[1], version: `Sites24 · fuente ${published[2]} · versión ${published[3]}`, preparedAt: priorReview.at };
    sprint.updatedAt = stamp;
    const reason = sitesClarification ? 'Se corrige la invalidación automática por aclaración documental del runtime ya administrado por Sites en Plan v26.' : 'Se corrige la invalidación automática por cambio administrativo de colores en Plan v22.';
    sprint.history.push({ at: stamp, action: 'aceptacion_restaurada', reference: `${reason} Requisitos y evidencias funcionales preservados; aprobación explícita original de ${lastApproval.at}: ${lastApproval.reference}` });
  }
  state.planHash = hash(plan);
  state.contextHash = unchangedContext;
  state.updatedAt = stamp;
  await save(state);
  console.log(`Aprobaciones y evidencias históricas de los sprints 1 y 2 restauradas; ${sitesClarification ? 'la aclaración de Sites' : 'el cambio de colores'} no alteró el contexto funcional.`);
}

function pointRows(points) {
  let acceptanceHeading = false;
  return points.map(point => {
    const heading = point.kind === 'aceptacion' && !acceptanceHeading ? '<tr class="acceptance-heading"><th colspan="4">Criterios de aceptación</th></tr>' : '';
    acceptanceHeading ||= point.kind === 'aceptacion';
    return heading + `<tr class="point-row ${point.status}"><th scope="row">${escape(point.id)}</th><td>${escape(point.text)}</td><td><span class="status ${point.status}">${labels[point.status]}</span></td><td>${escape(point.evidence || '—')}</td></tr>`;
  }).join('');
}

function blockGroups(sprint) {
  const groups = new Map();
  for (const point of sprint.points) {
    if (!groups.has(point.blockId)) groups.set(point.blockId, { id: point.blockId, name: point.group, points: [] });
    groups.get(point.blockId).points.push(point);
  }
  return [...groups.values()];
}

const blockComplete = block => block.points.length > 0 && block.points.every(point => point.status === 'terminado' && point.evidence.trim());

function groupSections(sprint) {
  let firstIncomplete = null;
  return blockGroups(sprint).map(block => {
    const { name, points } = block;
    const done = points.filter(point => point.status === 'terminado').length;
    const complete = blockComplete(block);
    const gate = firstIncomplete ? `<small class="block-gate">Requiere ${firstIncomplete}</small>` : '';
    if (!complete && !firstIncomplete) firstIncomplete = block.id;
    const id = `section-${points[0].id}`;
    return `<details class="sprint-section" data-group="${id}" data-complete="${complete}"${complete ? '' : ' open'}><summary><h2 id="${id}">${escape(name)}</h2><span class="block-progress">${done} / ${points.length}${gate}</span></summary><div class="table-wrap"><table aria-labelledby="${id}"><thead><tr><th scope="col">Punto</th><th scope="col">Trabajo y resultado requerido</th><th scope="col">Estado</th><th scope="col">Evidencia o bloqueo</th></tr></thead><tbody>${pointRows(points)}</tbody></table></div></details>`;
  }).join('');
}

function counts(sprint) {
  return { done: sprint.points.filter(p => p.status === 'terminado').length, pending: sprint.points.filter(p => ['pendiente', 'en_curso'].includes(p.status)).length, failed: sprint.points.filter(p => p.status === 'no_completado').length, total: sprint.points.length };
}

function guideHtml(sprint) {
  return sprint.reviewSteps.map(step => `<li><strong>${escape(step.action)}</strong><p>${escape(step.expected)}</p></li>`).join('');
}

function controlHtml(state) {
  return `<details class="control-rules" data-group="control-rules" data-complete="false"><summary><h2>Reglas de cumplimiento · Plan v${state.planVersion}</h2></summary>${state.controlScope ? `<p>${escape(state.controlScope)}</p>` : ''}${state.liveWorkflow ? `<p class="live-workflow">${escape(state.liveWorkflow)}</p>` : ''}<ol>${state.controlRules.map(rule => `<li>${escape(rule)}</li>`).join('')}</ol></details>`;
}

function content(state, number) {
  if (!number) return `<h1>Seguimiento de sprints</h1>${controlHtml(state)}<p>Las soluciones de la revisión técnica están incorporadas al plan. Cada función conserva su estado de desarrollo y requiere tu aprobación al cerrar el sprint.</p><div class="table-wrap"><table class="overview"><thead><tr><th>Sprint</th><th>Avance técnico</th><th>No completados</th><th>Estado del sprint</th><th>Aprobación</th></tr></thead><tbody>${state.sprints.map(sprint => {
    const c = counts(sprint);
    const rowStatus = sprint.phase === 'en_curso' ? 'en_curso' : sprint.phase === 'aprobado' ? 'terminado' : c.failed ? 'no_completado' : 'pendiente';
    return `<tr class="point-row ${rowStatus}"><th scope="row"><a href="sprint-${String(sprint.number).padStart(2, '0')}.html">${sprint.number}. ${escape(sprint.title)}</a></th><td>${c.done} / ${c.total} terminados</td><td>${c.failed}</td><td>${phaseLabels[sprint.phase]}</td><td>${sprint.approval.status === 'aprobado' ? 'Aprobado por el usuario' : 'Pendiente'}</td></tr>`;
  }).join('')}</tbody></table></div>`;
  const sprint = state.sprints.find(s => s.number === number);
  const c = counts(sprint);
  const awaiting = sprint.phase === 'esperando_aprobacion';
  return `<h1>Sprint ${String(number).padStart(2, '0')} · ${escape(sprint.title)}</h1><div class="summary"><span class="status terminado">${c.done} terminados</span><span class="status pendiente">${c.pending} pendientes / en curso</span><span class="status no_completado">${c.failed} no completados</span><span class="phase">${phaseLabels[sprint.phase]}</span></div><section class="approval" aria-label="Aprobación del sprint"><strong>Aprobación del usuario: ${sprint.approval.status === 'aprobado' ? 'registrada' : 'pendiente'}</strong><p>${sprint.approval.status === 'aprobado' ? escape(sprint.approval.reference) : awaiting ? 'La entrega está lista para tu revisión. El sprint permanece abierto hasta recibir tu aprobación explícita.' : 'El cierre requiere una entrega comprobada y tu aprobación explícita.'}</p></section>${controlHtml(state)}<div class="blocks">${groupSections(sprint)}</div><section class="review"><h2>Qué revisar en el portal</h2><p>${sprint.delivery ? `Entrega: <a href="${escape(sprint.delivery.url)}">Abrir versión para revisar</a> · Versión: ${escape(sprint.delivery.version)}` : 'Guía prevista. Las publicaciones parciales se documentan en las evidencias; la URL y versión de la entrega completa aparecerán aquí cuando todos los puntos estén verificados y el sprint esté preparado para revisión.'}</p><ol>${guideHtml(sprint)}</ol></section>`;
}

async function save(state) {
  await writeChanged(statePath, JSON.stringify(state, null, 2) + '\n');
  for (const number of [0, ...state.sprints.map(s => s.number)]) {
    const current = state.sprints.find(s => s.number === number);
    const stamp = current?.updatedAt ?? state.updatedAt;
    const snapshot = number ? { schemaVersion: state.schemaVersion, updatedAt: stamp, sprints: [current] } : { schemaVersion: state.schemaVersion, updatedAt: stamp, sprints: state.sprints.map(s => ({ ...s, points: s.points.map(p => ({ status: p.status })), reviewSteps: [] })) };
    const filename = number ? `sprint-${String(number).padStart(2, '0')}.html` : 'index.html';
    const title = number ? `Sprint ${number} · ${state.sprints.find(s => s.number === number).title}` : 'Seguimiento de sprints';
    const html = `<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><link rel="stylesheet" href="seguimiento.css"><script src="seguimiento.js" defer></script></head><body data-sprint="${number}"><header><a href="index.html">Sprints</a><a href="${portal}">Portal actual</a><span id="connection" role="status">Copia del informe · activar vista local para actualización en vivo</span></header><main id="report">${content(state, number)}</main><footer>Filas: verde y letras blancas = terminado y verificado · naranja y letras blancas = pendiente o en curso · rojo y letras blancas = no completado, fallo o bloqueo.<br>Actualización de datos: <time id="updated">${escape(stamp)}</time>. El avance técnico no sustituye la aprobación del usuario.</footer><script id="snapshot" type="application/json">${jsonInline(snapshot)}</script></body></html>\n`;
    await writeChanged(path.join(folder, filename), html);
  }
}

function requireArgument(name) {
  const value = args[name]?.trim();
  if (!value || value.startsWith('--')) throw new Error(`Falta --${name}.`);
  return value;
}

function validatedUrl(input) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('La entrega necesita una URL http/https sin credenciales.');
  return url.href;
}

async function mutate() {
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  const sprint = command === 'set' ? state.sprints.find(s => s.points.some(p => p.id === args.id)) : state.sprints.find(s => s.number === Number(args.sprint));
  if (!sprint) throw new Error('Sprint o identificador de punto inexistente.');
  if (state.sprints.some(s => s.number < sprint.number && s.phase !== 'aprobado')) throw new Error('Los sprints anteriores necesitan aceptación vigente del usuario antes de modificar este sprint.');
  const stamp = now();
  if (command === 'start') {
    if (sprint.phase !== 'pendiente') throw new Error('El sprint ya está iniciado o aprobado.');
    if (state.sprints.some(s => s.number < sprint.number && s.phase !== 'aprobado')) throw new Error('Los sprints anteriores necesitan aprobación explícita del usuario.');
    if (state.sprints.some(s => ['en_curso', 'esperando_aprobacion'].includes(s.phase))) throw new Error('Hay otro sprint abierto.');
    sprint.phase = 'en_curso';
  } else if (command === 'set') {
    if (!['en_curso', 'esperando_aprobacion'].includes(sprint.phase)) throw new Error('Iniciar o reabrir el sprint antes de cambiar sus puntos.');
    const status = requireArgument('status');
    if (!labels[status]) throw new Error('Estado inválido.');
    const evidence = args.evidence?.trim() ?? '';
    if (['terminado', 'no_completado'].includes(status) && !evidence) throw new Error('Terminado y no completado requieren evidencia o motivo.');
    const point = sprint.points.find(p => p.id === args.id);
    const blocks = blockGroups(sprint);
    const blockIndex = blocks.findIndex(block => block.id === point.blockId);
    const previousIncomplete = blocks.slice(0, blockIndex).find(block => !blockComplete(block));
    if (previousIncomplete) throw new Error(`No se puede avanzar a ${point.blockId}: completar y verificar las operaciones y criterios de ${previousIncomplete.id}.`);
    if (point.kind === 'aceptacion' && status === 'terminado' && blocks[blockIndex].points.some(p => p.kind === 'operacion' && (p.status !== 'terminado' || !p.evidence.trim()))) throw new Error(`Terminar las operaciones de ${point.blockId} antes de dar por cumplidos sus criterios.`);
    const invalidates = status !== 'terminado' || (point.kind === 'operacion' && point.status === 'terminado' && point.evidence !== evidence);
    point.status = status;
    point.evidence = evidence;
    point.updatedAt = stamp;
    point.history.push({ at: stamp, status, evidence });
    if (invalidates) {
      for (const affected of blocks.slice(blockIndex).flatMap(block => block.points)) {
        if (affected.id === point.id || affected.kind !== 'aceptacion' || affected.status !== 'terminado') continue;
        if (affected.blockId === point.blockId && point.kind === 'aceptacion') continue;
        affected.status = 'pendiente';
        affected.evidence = `Reverificar: cambió o quedó incompleto ${point.id}.`;
        affected.updatedAt = stamp;
        affected.history.push({ at: stamp, status: 'pendiente', evidence: affected.evidence });
      }
    }
    sprint.phase = 'en_curso';
    sprint.delivery = null;
    sprint.approval = { status: 'pendiente', at: null, reference: null };
  } else if (command === 'review') {
    if (sprint.phase !== 'en_curso') throw new Error('El sprint debe estar en curso para preparar la revisión.');
    if (sprint.points.some(p => p.status !== 'terminado' || !p.evidence.trim())) throw new Error('Hay puntos o criterios sin terminar y verificar.');
    sprint.delivery = { url: validatedUrl(requireArgument('url')), version: requireArgument('version'), preparedAt: stamp };
    sprint.phase = 'esperando_aprobacion';
  } else if (command === 'guide') {
    if (sprint.phase !== 'en_curso') throw new Error('La guía se actualiza durante el sprint, antes de presentar la revisión.');
    const steps = JSON.parse(await readFile(path.resolve(root, requireArgument('file')), 'utf8'));
    if (!Array.isArray(steps) || !steps.length || steps.length > 30 || steps.some(step => typeof step.action !== 'string' || !step.action.trim() || typeof step.expected !== 'string' || !step.expected.trim())) throw new Error('La guía requiere una lista de pasos con action y expected no vacíos.');
    sprint.reviewSteps = steps.map(({ action, expected }) => ({ action, expected }));
  } else if (command === 'approve') {
    if (sprint.phase !== 'esperando_aprobacion' || !sprint.delivery || sprint.points.some(p => p.status !== 'terminado' || !p.evidence.trim())) throw new Error('No existe una entrega completa esperando aprobación.');
    sprint.approval = { status: 'aprobado', at: stamp, reference: requireArgument('reference') };
    sprint.phase = 'aprobado';
  } else if (command === 'reject') {
    if (sprint.phase !== 'esperando_aprobacion') throw new Error('No existe una revisión pendiente.');
    sprint.approval = { status: 'cambios_solicitados', at: stamp, reference: requireArgument('reference') };
    sprint.phase = 'en_curso';
    sprint.delivery = null;
  } else if (command === 'reopen') {
    if (sprint.phase !== 'aprobado') throw new Error('Solo se reabre un sprint aprobado.');
    const reference = requireArgument('reference');
    for (const later of state.sprints.filter(s => s.number >= sprint.number)) {
      for (const point of later.points.filter(p => p.kind === 'aceptacion' && p.status === 'terminado')) {
        point.status = 'pendiente';
        point.evidence = `Reverificar: se reabrió el sprint ${sprint.number}.`;
        point.updatedAt = stamp;
        point.history.push({ at: stamp, status: 'pendiente', evidence: point.evidence });
      }
      later.updatedAt = stamp;
      later.phase = later.number === sprint.number ? 'en_curso' : 'pendiente';
      later.delivery = null;
      later.approval = { status: 'pendiente', at: null, reference: null };
      later.history.push({ at: stamp, action: 'reabierto', reference });
    }
  }
  sprint.history.push({ at: stamp, action: command, pointId: args.id ?? null, reference: args.reference ?? args.evidence ?? null });
  sprint.updatedAt = stamp;
  state.updatedAt = stamp;
  await save(state);
  console.log(`Sprint ${sprint.number}: ${phaseLabels[sprint.phase]}. Informe actualizado.`);
}

async function serve() {
  const port = args.port ? Number(args.port) : 4174;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Puerto inválido.');
  const allowed = /^(index\.html|sprint-(0[1-9]|10)\.html|estado\.json|seguimiento\.(css|js))$/;
  const cache = new Map();
  const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  const server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
      const name = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).replace(/^\//, '') || 'index.html';
      if (!allowed.test(name)) { response.writeHead(404); response.end('No encontrado'); return; }
      const file = path.join(folder, name);
      const info = await stat(file);
      let cached = cache.get(name);
      if (!cached || cached.mtime !== info.mtimeMs || cached.size !== info.size) {
        const bytes = await readFile(file);
        cached = { mtime: info.mtimeMs, size: info.size, bytes, etag: '"' + hash(bytes) + '"' };
        cache.set(name, cached);
      }
      const headers = { 'Content-Type': types[path.extname(name)], 'Cache-Control': 'no-cache', ETag: cached.etag, 'X-Content-Type-Options': 'nosniff' };
      if (request.headers['if-none-match'] === cached.etag) { response.writeHead(304, headers); response.end(); return; }
      response.writeHead(200, headers);
      response.end(request.method === 'HEAD' ? undefined : cached.bytes);
    } catch { response.writeHead(404); response.end('No encontrado'); }
  });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Seguimiento: http://127.0.0.1:${port}/`));
}

try {
  if (command === 'sync') await sync();
  else if (command === 'serve') await serve();
  else if (['restore-display-only-invalidation', 'restore-administrative-invalidation'].includes(command)) await restoreDisplayOnlyInvalidation();
  else if (['start', 'set', 'review', 'guide', 'approve', 'reject', 'reopen'].includes(command)) await mutate();
  else console.log('Comandos: sync | serve [--port 4174] | start --sprint N | set --id ID --status ESTADO --evidence TEXTO | guide --sprint N --file JSON_DE_PASOS | review --sprint N --url URL --version VERSION | approve/reject/reopen --sprint N --reference MENSAJE_DEL_USUARIO');
} catch (error) { console.error(error.message); process.exitCode = 1; }
