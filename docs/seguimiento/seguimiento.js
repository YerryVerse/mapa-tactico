(() => {
  'use strict';
  const report = document.querySelector('#report');
  const connection = document.querySelector('#connection');
  const time = document.querySelector('#updated');
  const number = Number(document.body.dataset.sprint);
  let state = JSON.parse(document.querySelector('#snapshot').textContent);
  let etag = null;
  let timer = null;
  let pending = false;
  const assetTags = new Map();
  const preferenceKey = `atlas:sprint-sections:${number}`;
  const positionKey = `${preferenceKey}:position`;
  let sectionChoices = {};
  try { sectionChoices = JSON.parse(localStorage.getItem(preferenceKey) || '{}'); } catch { /* Disponible sin almacenamiento. */ }
  if (!sectionChoices || typeof sectionChoices !== 'object' || Array.isArray(sectionChoices)) sectionChoices = {};
  function restoreSections() {
    report.querySelectorAll('.sprint-section, .control-rules').forEach(section => {
      const key = section.dataset.group;
      const complete = section.dataset.complete === 'true';
      const previous = sectionChoices[key];
      section.open = previous && previous.complete === complete ? previous.open : section.matches('.control-rules') ? false : !complete;
      sectionChoices[key] = { open: section.open, complete };
    });
  }
  report.addEventListener('toggle', event => {
    const section = event.target;
    if (!section.matches('.sprint-section, .control-rules')) return;
    sectionChoices[section.dataset.group] = { open: section.open, complete: section.dataset.complete === 'true' };
    try {
      const serialized = JSON.stringify(sectionChoices);
      if (localStorage.getItem(preferenceKey) !== serialized) localStorage.setItem(preferenceKey, serialized);
    } catch { /* La interacción permanece disponible sin almacenamiento. */ }
  }, true);
  function updateTime() {
    time.dateTime = state.updatedAt;
    time.textContent = new Intl.DateTimeFormat('es-DO', { dateStyle:'medium', timeStyle:'medium', timeZone:'America/Santo_Domingo' }).format(new Date(state.updatedAt));
  }
  updateTime();
  restoreSections();
  try {
    const position = JSON.parse(sessionStorage.getItem(positionKey) || 'null');
    sessionStorage.removeItem(positionKey);
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) requestAnimationFrame(() => scrollTo(position.x, position.y));
  } catch { /* El navegador también conserva su posición al recargar. */ }
  if (!['http:','https:'].includes(location.protocol)) return;
  async function checkAsset(name, signal) {
    const previous = assetTags.get(name);
    const response = await fetch(name, { method:'HEAD', cache:'no-store', signal, headers:previous ? {'If-None-Match':previous} : {} });
    if (response.status === 304) return false;
    if (!response.ok) throw new Error('Recurso no disponible');
    const next = response.headers.get('ETag');
    if (previous && next && previous !== next) return true;
    assetTags.set(name, next);
    return false;
  }
  function applyDocument(html) {
    const nextDocument = new DOMParser().parseFromString(html, 'text/html');
    const nextReport = nextDocument.querySelector('#report');
    const snapshot = nextDocument.querySelector('#snapshot');
    if (!nextReport || !snapshot || Number(nextDocument.body.dataset.sprint) !== number) throw new Error('Informe inválido');
    const next = JSON.parse(snapshot.textContent);
    if (next.schemaVersion !== 1 || !Array.isArray(next.sprints)) throw new Error('Formato inválido');
    const position = { x:scrollX, y:scrollY };
    const focusedGroup = document.activeElement?.closest('.sprint-section')?.dataset.group;
    report.replaceChildren(...nextReport.childNodes);
    document.title = nextDocument.title;
    document.querySelector('#snapshot').textContent = snapshot.textContent;
    state = next;
    restoreSections();
    updateTime();
    if (focusedGroup) report.querySelector(`[data-group="${CSS.escape(focusedGroup)}"] summary`)?.focus({ preventScroll:true });
    scrollTo(position.x, position.y);
  }
  async function refresh() {
    if (document.hidden || pending) return;
    pending = true;
    let delay = 3000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const [response, cssChanged, jsChanged] = await Promise.all([
        fetch(location.pathname, { cache:'no-store', signal:controller.signal, headers:etag ? {'If-None-Match':etag} : {} }),
        checkAsset('seguimiento.css', controller.signal),
        checkAsset('seguimiento.js', controller.signal)
      ]);
      if (cssChanged || jsChanged) {
        try { sessionStorage.setItem(positionKey, JSON.stringify({ x:scrollX, y:scrollY })); } catch { /* Recargar incluso sin almacenamiento. */ }
        location.reload();
        return;
      }
      if (response.status !== 304) {
        if (!response.ok) throw new Error('Seguimiento no disponible');
        applyDocument(await response.text());
        etag = response.headers.get('ETag');
      }
      connection.textContent = 'En vivo · HTML actualizado cada 3 segundos';
    } catch {
      connection.textContent = 'Sin conexión · mostrando el último informe recibido';
      delay = 10000;
    } finally {
      clearTimeout(timeout);
      pending = false;
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(refresh, delay);
    }
  }
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) refresh();
  });
  connection.textContent = 'Conectando seguimiento…';
  refresh();
})();

