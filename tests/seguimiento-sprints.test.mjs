import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

const root = path.resolve(import.meta.dirname, '..');
const temporaryRoot = path.resolve(tmpdir());
const temporary = await mkdtemp(path.join(temporaryRoot, 'atlas-seguimiento-qa-'));
const stateFile = path.join(temporary, 'docs', 'seguimiento', 'estado.json');
let child;
const state = async () => JSON.parse(await readFile(stateFile, 'utf8'));
function cli(command, ...args) {
  const result = spawnSync(process.execPath, [path.join(temporary, 'scripts', 'seguimiento-sprints.mjs'), command, ...args], { cwd: temporary, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  return result;
}
function succeeds(command, ...args) { const result = cli(command, ...args); assert.equal(result.status, 0, result.stderr); }
function fails(command, ...args) { const result = cli(command, ...args); assert.notEqual(result.status, 0, 'Se aceptó una transición inválida'); }

try {
  for (const relative of ['scripts/seguimiento-sprints.mjs', 'docs/PLAN_DE_SPRINTS.md', 'docs/seguimiento/seguimiento.js', 'docs/seguimiento/seguimiento.css']) {
    const target = path.join(temporary, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, relative), target);
  }
  succeeds('sync');
  let data = await state();
  assert.equal(data.sprints.length, 10);
  const ids = data.sprints.flatMap(s => s.points.map(p => p.id));
  assert.equal(new Set(ids).size, ids.length);
  assert(data.sprints.every(s => s.points.every(p => p.status === 'pendiente')));
  const naturalPoint = data.sprints[4].points.find(p => p.id === 'S05-5A-01');
  assert(naturalPoint.text.includes('Al menos uno de los dos casos debe disponer de una geometría documentada'), 'No perder continuaciones de operaciones al generar el documento');
  assert((await readFile(path.join(temporary, 'docs', 'seguimiento', 'sprint-05.html'), 'utf8')).includes(naturalPoint.text), 'El HTML debe conservar el requisito completo');
  for (const sprint of data.sprints) {
    for (const blockId of new Set(sprint.points.map(point => point.blockId))) {
      const points = sprint.points.filter(point => point.blockId === blockId);
      const firstCriterion = points.findIndex(point => point.kind === 'aceptacion');
      assert(firstCriterion > 0, `Bloque ${blockId} sin operaciones o criterios`);
      assert(points.slice(firstCriterion).every(point => point.kind === 'aceptacion'), 'Los criterios deben estar al final de cada bloque');
    }
  }
  const initialHtml = await readFile(path.join(temporary, 'docs', 'seguimiento', 'sprint-01.html'), 'utf8');
  const groups = new Set(data.sprints[0].points.map(p => p.group));
  assert.equal((initialHtml.match(/<details class="sprint-section"/g) || []).length, groups.size);
  assert.equal((initialHtml.match(/data-complete="false" open/g) || []).length, groups.size, 'Los bloques pendientes deben estar abiertos');
  const initialTime = (await stat(stateFile)).mtimeMs;
  succeeds('sync');
  assert.equal((await stat(stateFile)).mtimeMs, initialTime, 'Sincronizar sin cambios no debe escribir');
  const fixturePlan = path.join(temporary, 'docs', 'PLAN_DE_SPRINTS.md');
  const validPlan = await readFile(fixturePlan, 'utf8');
  await writeFile(fixturePlan, validPlan.replace(data.sprints[0].points[0].text, data.sprints[0].points[0].text + '\n1. Identificador duplicado solo en fixture QA.'), 'utf8');
  fails('sync');
  assert.equal((await stat(stateFile)).mtimeMs, initialTime, 'Un plan inválido no debe sobrescribir el estado');
  await writeFile(fixturePlan, validPlan, 'utf8');
  fails('start', '--sprint', '2');
  fails('approve', '--sprint', '1', '--reference', 'QA aislado, sin aprobación real');
  succeeds('start', '--sprint', '1');
  fails('start', '--sprint', '2');
  const id = data.sprints[0].points[0].id;
  fails('set', '--id', id, '--status', 'terminado');
  succeeds('set', '--id', id, '--status', 'no_completado', '--evidence', 'Bloqueo ficticio en prueba aislada');
  assert.equal((await state()).sprints[0].points[0].status, 'no_completado');
  const firstBlock = data.sprints[0].points[0].blockId;
  const firstCriterion = data.sprints[0].points.find(point => point.kind === 'aceptacion');
  const nextBlockPoint = data.sprints[0].points.find(point => point.blockId !== firstBlock);
  fails('set', '--id', nextBlockPoint.id, '--status', 'en_curso');
  fails('set', '--id', firstCriterion.id, '--status', 'terminado', '--evidence', 'QA aislado');
  for (const point of data.sprints[0].points.filter(point => point.blockId === firstBlock && point.kind === 'operacion')) succeeds('set', '--id', point.id, '--status', 'terminado', '--evidence', 'Operaciones verificadas solo en fixture QA');
  fails('set', '--id', nextBlockPoint.id, '--status', 'en_curso');
  succeeds('set', '--id', firstCriterion.id, '--status', 'terminado', '--evidence', 'Criterio verificado solo en fixture QA');
  fails('set', '--id', nextBlockPoint.id, '--status', 'en_curso');
  for (const point of data.sprints[0].points.filter(point => point.blockId === firstBlock && point.kind === 'aceptacion')) succeeds('set', '--id', point.id, '--status', 'terminado', '--evidence', 'Aceptación técnica solo en fixture QA');
  succeeds('set', '--id', nextBlockPoint.id, '--status', 'en_curso');
  succeeds('set', '--id', firstCriterion.id, '--status', 'no_completado', '--evidence', 'Fallo ficticio de criterio, solo en fixture QA');
  fails('set', '--id', nextBlockPoint.id, '--status', 'terminado', '--evidence', 'QA aislado');
  fails('review', '--sprint', '1', '--url', 'https://example.com', '--version', 'QA aislado');
  const otherFile = path.join(temporary, 'docs', 'seguimiento', 'sprint-02.html');
  const otherTime = (await stat(otherFile)).mtimeMs;
  const evidence = 'QA aislado <script>alert(1)</script>, sin efecto sobre el portal';
  for (const point of data.sprints[0].points) succeeds('set', '--id', point.id, '--status', 'terminado', '--evidence', evidence);
  assert.equal((await stat(otherFile)).mtimeMs, otherTime, 'Un cambio del sprint 1 no debe reescribir el HTML del 2');
  const temporaryPlan = path.join(temporary, 'docs', 'PLAN_DE_SPRINTS.md');
  const planText = await readFile(temporaryPlan, 'utf8');
  await writeFile(temporaryPlan, planText.replace(data.sprints[0].points[0].text, data.sprints[0].points[0].text + ' Requisito modificado solo en fixture QA.'), 'utf8');
  succeeds('sync');
  const changedState = await state();
  assert.equal(changedState.sprints[0].phase, 'pendiente');
  assert(changedState.sprints[0].points.filter(point => point.kind === 'aceptacion').every(point => point.status === 'pendiente'), 'Un cambio de requisito debe exigir nueva comprobación');
  succeeds('start', '--sprint', '1');
  fails('set', '--id', nextBlockPoint.id, '--status', 'en_curso');
  for (const point of data.sprints[0].points) succeeds('set', '--id', point.id, '--status', 'terminado', '--evidence', evidence);
  fails('review', '--sprint', '1', '--url', 'javascript:alert(1)', '--version', 'QA aislado');
  succeeds('review', '--sprint', '1', '--url', 'https://example.com/revision', '--version', 'QA aislado');
  fails('approve', '--sprint', '1');
  fails('start', '--sprint', '2');
  succeeds('approve', '--sprint', '1', '--reference', 'Registro ficticio de autorización, solo en fixture temporal QA');
  fails('set', '--id', id, '--status', 'pendiente');
  succeeds('start', '--sprint', '2');
  const beforeCascade = await state();
  const beforeCascadePlan = await readFile(temporaryPlan, 'utf8');
  for (const point of beforeCascade.sprints[1].points) succeeds('set', '--id', point.id, '--status', 'terminado', '--evidence', 'Aceptación temporal solo en fixture QA');
  succeeds('review', '--sprint', '2', '--url', 'https://example.com/revision-2', '--version', 'QA aislado');
  succeeds('approve', '--sprint', '2', '--reference', 'Autorización ficticia solo en fixture QA');
  succeeds('start', '--sprint', '3');
  await writeFile(temporaryPlan, beforeCascadePlan.replace(beforeCascade.sprints[0].points[0].text, beforeCascade.sprints[0].points[0].text + ' Cambio anterior solo en fixture QA.'), 'utf8');
  succeeds('sync');
  const cascade = await state();
  assert(cascade.sprints.slice(0, 3).every(s => s.phase === 'pendiente'), 'Un cambio anterior debe detener sprints posteriores');
  assert.equal(cascade.sprints[1].approval.status, 'pendiente', 'Retirar aceptación posterior dependiente');
  assert(cascade.sprints[1].points.filter(p => p.kind === 'aceptacion').every(p => p.status === 'pendiente'), 'Reverificar criterios de sprints posteriores');
  fails('set', '--id', cascade.sprints[2].points[0].id, '--status', 'en_curso');
  await writeFile(stateFile, JSON.stringify(beforeCascade, null, 2) + '\n', 'utf8');
  await writeFile(temporaryPlan, beforeCascadePlan.replace('### Contrato mínimo de las API', '### Contrato mínimo de las API\n\nCambio común solo en fixture QA.'), 'utf8');
  succeeds('sync');
  assert((await state()).sprints.slice(0,2).every(s => s.phase === 'pendiente'), 'Los contratos comunes también invalidan la aceptación');
  const staleFixture = structuredClone(beforeCascade);
  staleFixture.sprints[0].phase = 'pendiente';
  await writeFile(stateFile, JSON.stringify(staleFixture, null, 2) + '\n', 'utf8');
  fails('set', '--id', staleFixture.sprints[1].points[0].id, '--status', 'en_curso');
  await writeFile(stateFile, JSON.stringify(beforeCascade, null, 2) + '\n', 'utf8');
  await writeFile(temporaryPlan, beforeCascadePlan, 'utf8');
  succeeds('sync');
  const html = await readFile(path.join(temporary, 'docs', 'seguimiento', 'sprint-01.html'), 'utf8');
  assert.equal((html.match(/data-complete="true">/g) || []).length, groups.size, 'Todos los bloques terminados deben estar colapsados al generar el HTML');
  assert(!html.includes('<script>alert(1)</script>'));
  assert(html.includes('&lt;script&gt;'));
  succeeds('reopen', '--sprint', '1', '--reference', 'Reapertura ficticia en fixture QA');
  data = await state();
  assert.equal(data.sprints[0].phase, 'en_curso');
  assert.equal(data.sprints[1].phase, 'pendiente');
  assert.equal(data.sprints[0].approval.status, 'pendiente');
  assert(data.sprints[0].points.filter(p => p.kind === 'aceptacion').every(p => p.status === 'pendiente'), 'Reabrir exige reverificar criterios aunque no cambie una operación');
  succeeds('set', '--id', id, '--status', 'no_completado', '--evidence', 'Regresión ficticia en QA aislado');
  const reopenedHtml = await readFile(path.join(temporary, 'docs', 'seguimiento', 'sprint-01.html'), 'utf8');
  assert.equal((reopenedHtml.match(/data-complete="false" open/g) || []).length, groups.size, 'Reabrir un bloque debe exigir nueva comprobación de los criterios posteriores');
  assert((await state()).sprints[0].points.filter(point => point.kind === 'aceptacion').every(point => point.status === 'pendiente'));
  fails('set', '--id', nextBlockPoint.id, '--status', 'en_curso');
  fails('start', '--sprint', '2');

  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  child = spawn(process.execPath, [path.join(temporary, 'scripts', 'seguimiento-sprints.mjs'), 'serve', '--port', String(port)], { cwd: temporary, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Servidor QA no inició')), 5000);
    child.once('error', reject);
    child.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
  });
  const base = `http://127.0.0.1:${port}/`;
  const beforeRequests = (await stat(stateFile)).mtimeMs;
  const response = await fetch(base + 'estado.json');
  assert.equal(response.status, 200);
  const etag = response.headers.get('etag');
  assert.equal((await fetch(base + 'estado.json', { headers: { 'If-None-Match': etag } })).status, 304);
  assert.equal((await fetch(base + 'estado.json', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + 'archivo-no-permitido.md')).status, 404);
  assert.equal((await stat(stateFile)).mtimeMs, beforeRequests, 'Consultar el seguimiento no debe escribir estados');
  console.log('QA correcta: criterios por bloque, paso secuencial, evidencia, invalidación tras fallo, aprobación de sprints, colapso, escape de texto, escrituras acotadas y servidor de solo lectura con ETag. Todas las mutaciones ocurrieron en una carpeta temporal, no en el seguimiento real.');
} finally {
  if (child) { child.kill(); await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve)); }
  const relative = path.relative(temporaryRoot, path.resolve(temporary));
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Ruta temporal fuera del destino previsto');
  await rm(temporary, { recursive: true, force: true });
}
