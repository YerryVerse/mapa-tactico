import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const logs = path.join(root, '.sites-runtime', 'live-preview');
mkdirSync(logs, { recursive: true });
const services = [
  { name: 'seguimiento', port: 4174, route: '/estado.json', args: ['scripts/seguimiento-sprints.mjs', 'serve', '--port', '4174'], valid: text => JSON.parse(text).project === 'Mapa Táctico' },
  { name: 'portal', port: 5273, route: '/', args: ['scripts/run-framework.mjs', 'dev', '--hostname', '127.0.0.1', '--port', '5273'], valid: text => text.includes('Mapa Táctico') && (text.includes('vite-rsc/entry-browser') || text.includes('/@vite/client')) }
];
const listening = port => new Promise(resolve => {
  const socket = net.connect({ host: '127.0.0.1', port });
  socket.setTimeout(1000);
  const finish = value => { socket.destroy(); resolve(value); };
  socket.once('connect', () => finish(true));
  socket.once('error', () => finish(false));
  socket.once('timeout', () => finish(false));
});
async function healthy(service) {
  try {
    const response = await fetch(`http://127.0.0.1:${service.port}${service.route}`, { signal: AbortSignal.timeout(2500) });
    return response.ok && service.valid(await response.text());
  } catch { return false; }
}
for (const service of services) {
  if (await listening(service.port)) {
    if (!await healthy(service)) throw new Error(`El puerto ${service.port} está ocupado por otro servicio o una vista sin actualización en caliente. No se abre otro puerto ni se detiene ese proceso.`);
    console.log(`Reutilizado ${service.name}: http://127.0.0.1:${service.port}/`);
    continue;
  }
  if (service.name === 'portal') execFileSync(process.execPath, ['scripts/preparar-worker.mjs'], { cwd: root, stdio: 'inherit', windowsHide: true });
  const logFile = path.join(logs, `${service.name}.log`);
  const output = openSync(logFile, 'a');
  const child = spawn(process.execPath, service.args, { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', output, output] });
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  closeSync(output);
  child.unref();
  let ready = false;
  for (let attempt = 0; attempt < 25; attempt++) {
    if (await healthy(service)) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error(`No arrancó ${service.name}. Revisar ${logFile}; no abrir otra pestaña ni otro puerto.`);
  console.log(`Iniciado ${service.name}: http://127.0.0.1:${service.port}/ · PID ${child.pid}`);
}
console.log('Conservar las dos pestañas existentes. Este comando no abre ventanas ni pestañas.');
