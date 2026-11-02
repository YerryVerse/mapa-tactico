// Vista local de solo lectura; fuera del runtime publicado en Sites.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const folder = path.resolve(import.meta.dirname, '../docs/conceptos');
const htmlPath = path.join(folder, 'tabla-explosiones.html');
const dataPath = path.join(folder, 'tabla-explosiones.json');
const port = 4175;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

const server = http.createServer(async (request, response) => {
  const send = (status, body, type = 'application/json; charset=utf-8') => {
    response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Vista de solo lectura' }));
      return;
    }
    const route = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
    if (['GET', 'HEAD'].includes(request.method) && ['/', '/tabla-explosiones.html'].includes(route)) {
      send(200, await readFile(htmlPath), 'text/html; charset=utf-8');
    } else if (request.method === 'GET' && route === '/version') {
      const [html, data] = await Promise.all([readFile(htmlPath), readFile(dataPath)]);
      send(200, JSON.stringify({ html: digest(html), data: digest(data) }));
    } else if (request.method === 'GET' && route === '/data') {
      const bytes = await readFile(dataPath);
      send(200, JSON.stringify({ revision: digest(bytes), document: JSON.parse(bytes.toString('utf8')) }));
    } else {
      send(404, JSON.stringify({ error: 'No encontrado' }));
    }
  } catch (error) {
    console.error(error.message);
    if (!response.headersSent) send(500, JSON.stringify({ error: 'No se pudo leer la tabla' }));
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Tabla de referencias: http://127.0.0.1:${port}/tabla-explosiones.html`));
