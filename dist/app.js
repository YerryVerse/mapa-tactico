'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const icons = {
    cylinder: '<rect x="7" y="6" width="10" height="15" rx="3"/><path d="M10 6V3h4v3M7 10h10M10 21v2m4-2v2"/>',
    tank: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M8 7V4h8v3M6 18v4m12-4v4M11 4V2"/>',
    port: '<path d="M2 21h20M4 21V10h16v11M4 15h16M8 10V6h8v4M12 6V2M1 10h22M8 15v6m8-6v6"/>',
    conventional: '<path d="M8 18l-3 3m1-6l-3 3m6-9l6-6 6 6-6 6zM9 9l-4 1 4 4-1 4 6-3M15 3v6h6"/>',
    nuclear: '<circle cx="12" cy="12" r="2"/><path d="M9 8L6 3a10 10 0 0112 0l-3 5M8 14l-6 1a10 10 0 006 8l3-6m5-3l6 1a10 10 0 01-6 8l-3-6"/>'
  };
  const scenarios = [
    {id:'domestic',category:'accidental',name:'Tanque de gas doméstico',subtitle:'PEQUEÑO · USO RESIDENCIAL',kind:'ESCENARIO DOMÉSTICO',icon:'cylinder',description:'Un incidente cotidiano para explorar la importancia de la prevención y la preparación.',context:'Los incidentes con gas doméstico dependen de las condiciones del lugar y del equipo. Este ejercicio presenta una comunidad inventada; no calcula los efectos de un cilindro real.'},
    {id:'industrial',category:'accidental',name:'Tanque de gas industrial',subtitle:'INSTALACIÓN · ENTORNO INDUSTRIAL',kind:'ESCENARIO INDUSTRIAL',icon:'tank',description:'Un escenario conceptual sobre incidentes industriales y la respuesta de una comunidad.',context:'Las emergencias industriales pueden afectar a trabajadores y comunidades próximas. La simulación es una representación abstracta y no usa cantidades de gas, presión ni características de instalaciones reales.'},
    {id:'beirut',category:'accidental',name:'Beirut, 2020',subtitle:'HISTÓRICO · LÍBANO',kind:'MEMORIA HISTÓRICA',icon:'port',description:'Una referencia histórica para comprender la dimensión humana de un desastre.',context:'El 4 de agosto de 2020 se produjo una gran explosión en el puerto de Beirut, Líbano. ATLAS ofrece contexto sobre este suceso; los números del ejercicio no reconstruyen sus víctimas ni sus efectos.',source:'https://apnews.com/article/415b95004a8e914ce53400900fa7392a',sourceName:'Associated Press · El puerto de Beirut'},
    {id:'conventional',category:'military',name:'Explosión convencional',subtitle:'CONCEPTUAL · NO ESPECIFICA UN ARMA',kind:'ESCENARIO CONVENCIONAL',icon:'conventional',description:'Una representación abstracta del impacto humanitario de una explosión convencional.',context:'Este escenario permite reflexionar sobre las consecuencias de un conflicto para la población civil. No representa una bomba concreta, no contiene especificaciones de armas y no permite estimar ataques reales.'},
    {id:'nuclear',category:'military',name:'Evento nuclear',subtitle:'CONCEPTUAL · PERSPECTIVA HUMANITARIA',kind:'ESCENARIO NUCLEAR',icon:'nuclear',description:'Una mirada educativa a las consecuencias humanitarias de un evento nuclear.',context:'El Comité Internacional de la Cruz Roja describe consecuencias humanitarias catastróficas derivadas del uso de armas nucleares. Los números y anillos de ATLAS son ficticios: no modelan radiación, potencia, efectos térmicos ni consecuencias de una detonación real.',source:'https://www.icrc.org/en/article/faq-nuclear-weapons',sourceName:'CICR · Preguntas frecuentes sobre armas nucleares'}
  ];
  const fmt = new Intl.NumberFormat('es-ES');
  let selected = scenarios[0], category = 'accidental', point = [15,18], pointCount = 1;
  let world, borders, projection, path, width=0,height=0,radius=0,cx=0,cy=0,zoom=1,view=[15,23],auto=false;
  let effectStart=0, hasResult=false, pointerStart=null, dragged=false, toastTimer, raf=0, lastTime=0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas=$('globe'), ctx=canvas.getContext('2d'), base=document.createElement('canvas'), bctx=base.getContext('2d');
  const graticule = d3.geoGraticule().step([15,15])();

  function renderCatalog(){
    $('scenarioList').innerHTML=scenarios.filter(s=>s.category===category).map(s=>`<button class="scenario-card ${s.id===selected.id?'selected':''}" data-id="${s.id}" aria-pressed="${s.id===selected.id}"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[s.icon]}</svg><span class="card-text"><strong>${s.name}</strong><small>${s.subtitle}</small></span><span class="card-dot"></span></button>`).join('');
    $('scenarioKind').textContent=selected.kind;
    $('scenarioDescription').textContent=selected.description;
  }
  function switchCategory(next){
    category=next; selected=scenarios.find(s=>s.category===next);
    document.querySelectorAll('[data-category]').forEach(b=>{const active=b.dataset.category===next;b.classList.toggle('selected',active);b.setAttribute('aria-selected',String(active));});
    renderCatalog(); resetResult();
  }
  $('scenarioList').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b)return;selected=scenarios.find(s=>s.id===b.dataset.id);renderCatalog();resetResult();});
  document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>switchCategory(b.dataset.category)));
  function coordinateLabel(p){return `${Math.abs(p[1]).toFixed(2)}° ${p[1]>=0?'N':'S'} · ${Math.abs(p[0]).toFixed(2)}° ${p[0]>=0?'E':'O'}`;}
  function updatePoint(){
    $('pointName').textContent=point?`Punto ${String(pointCount).padStart(2,'0')}`:'Sin punto';
    $('pointCoords').textContent=point?coordinateLabel(point):'Selecciona un punto en el globo';
    $('simulate').disabled=!point||!world;
    $('clearPoint').disabled=!point;
    $('viewCoords').textContent=coordinateLabel(view);
  }
  function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
  function resetResult(){hasResult=false;effectStart=0;$('emptyResults').hidden=false;$('resultNumbers').hidden=true;$('resultStatus').textContent='EN ESPERA';$('simulate').querySelector('span').textContent='Detonar escenario';draw();}
  function clearPoint(){point=null;resetResult();updatePoint();draw();notify('Selecciona un nuevo punto en el globo.');}
  $('clearPoint').addEventListener('click',clearPoint);
  $('population').addEventListener('input',()=>{$('populationValue').textContent=fmt.format(Number($('population').value));resetResult();});
  $('preparedness').addEventListener('change',resetResult);
  $('resetSimulation').addEventListener('click',()=>{resetResult();notify('Escenario reiniciado. Puedes cambiar el punto o la configuración.');});

  // Fictional board-game coefficients: deliberately unrelated to weapons,
  // geography, blast physics or real population. Displayed in the methodology.
  function fictionalOutcome(population,preparedness){
    const fraction={high:.08,medium:.16,low:.24}[preparedness];
    const affected=Math.round(population*fraction);
    const deceased=Math.round(affected*.1);
    return {injured:affected-deceased,deceased,remaining:population-affected};
  }
  $('simulate').addEventListener('click',()=>{
    if(!point||!world)return;
    const population=Number($('population').value), r=fictionalOutcome(population,$('preparedness').value);
    $('injured').textContent=fmt.format(r.injured);$('fatalities').textContent=fmt.format(r.deceased);$('remaining').textContent=fmt.format(r.remaining);
    $('fatalityBar').style.width=`${r.deceased/population*100}%`;$('injuryBar').style.width=`${r.injured/population*100}%`;
    $('emptyResults').hidden=true;$('resultNumbers').hidden=false;$('resultStatus').textContent='SIMULADO';
    $('simulate').querySelector('span').textContent='Volver a simular';
    // Show the selected point without adding any targeting or casualty model.
    if(d3.geoDistance(point,view)>1.2){view=[...point];renderBase();}
    auto=false;$('autoRotate').setAttribute('aria-pressed','false');hasResult=true;effectStart=performance.now();animate();
    notify('Simulación completada en una comunidad ficticia.');
  });

  function showDialog(html){$('dialogContent').innerHTML=html;$('infoDialog').showModal();}
  function showContext(){showDialog(`<h2>${selected.name}</h2><p>${selected.context}</p><p class="dialog-note">El punto del globo no modifica los resultados. Todos los escenarios usan el mismo modelo ficticio de comunidad.</p>${selected.source?`<div class="sources"><span class="eyebrow">LECTURA DE CONTEXTO</span><a href="${selected.source}" target="_blank" rel="noopener noreferrer">${selected.sourceName} ↗</a></div>`:''}`);}
  function showMethod(){showDialog('<h2>Comprender antes de comparar.</h2><p>ATLAS es un laboratorio visual educativo. El globo utiliza cartografía real; la comunidad y sus resultados son ficticios.</p><ul><li>La localización elegida es una referencia visual. No se consultan censos, ciudades ni densidades de población.</li><li>Los escenarios comparten una regla de juego. Elegir un evento nuclear o convencional no aplica un modelo de arma.</li><li>Los anillos y la animación no representan distancias, presión, calor, radiación ni zonas de daño.</li><li>Estos resultados no sirven para planificar, predecir ni evaluar una emergencia real.</li></ul><details><summary>Ver las reglas del ejercicio</summary><p>Se marcan como afectadas el 8 %, 16 % o 24 % de las unidades ficticias, según la preparación alta, intermedia o baja. El 10 % de esas unidades se muestra como fallecidas y el resto como heridas. Son porcentajes arbitrarios de juego, no tasas de víctimas ni eficacia de medidas reales.</p></details><div class="sources"><span class="eyebrow">CONTEXTO Y CARTOGRAFÍA</span><a href="https://www.icrc.org/en/article/faq-nuclear-weapons" target="_blank" rel="noopener noreferrer">CICR · Consecuencias humanitarias de las armas nucleares ↗</a><a href="https://apnews.com/article/415b95004a8e914ce53400900fa7392a" target="_blank" rel="noopener noreferrer">Associated Press · Beirut, 2020 ↗</a><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth · Cartografía de dominio público ↗</a></div>');}
  $('contextButton').addEventListener('click',showContext);
  ['methodNav','limitsButton'].forEach(id=>$(id).addEventListener('click',showMethod));
  $('aboutButton').addEventListener('click',()=>showDialog('<h2>Una perspectiva humana.</h2><p>ATLAS convierte el mundo en un espacio de exploración y aprendizaje. Una interfaz mínima, un globo interactivo y escenarios para reflexionar sobre la prevención y las consecuencias humanitarias.</p><p class="dialog-note">Versión 01 · Laboratorio educativo<br>Cartografía: Natural Earth / world-atlas<br>Visualización: D3 · Sin servicios de población ni geolocalización.</p>'));
  $('closeDialog').addEventListener('click',()=>$('infoDialog').close());
  $('infoDialog').addEventListener('click',e=>{if(e.target===$('infoDialog')){const r=$('infoDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('infoDialog').close();}});
  $('scenariosNav').addEventListener('click',()=>{document.querySelector('.scenario-panel').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});document.querySelector('.scenario-card.selected')?.focus({preventScroll:true});notify('Elige una categoría y un escenario en el panel de configuración.');});
  $('exploreNav').addEventListener('click',()=>{document.querySelector('.map-stage').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});canvas.focus({preventScroll:true});});

  function resize(){
    const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=base.width=Math.round(width*dpr);canvas.height=base.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);bctx.setTransform(dpr,0,0,dpr,0,0);
    cx=width/2;cy=width<=600?height*.565:width<=960?height*.55:height*.6;
    radius=width<=600?Math.min(width*.43,height*.32):width<=960?Math.min(width*.34,height*.365):Math.min(width*.26,height*.335);
    projection=d3.geoOrthographic().translate([cx,cy]).scale(radius*zoom).clipAngle(90).precision(.5);
    path=d3.geoPath(projection,bctx);renderBase();draw();
  }
  function renderBase(){
    if(!projection)return;
    projection.rotate([-view[0],-view[1],0]).scale(radius*zoom);
    bctx.clearRect(0,0,width,height);
    const r=radius*zoom;
    // Quiet framing marks around the globe.
    bctx.strokeStyle='#ffffff0b';bctx.lineWidth=.7;
    [r+22,r+38].forEach(rr=>{bctx.beginPath();bctx.arc(cx,cy,rr,0,Math.PI*2);bctx.stroke();});
    for(let a=0;a<360;a+=5){const rad=a*Math.PI/180;bctx.beginPath();bctx.moveTo(cx+Math.cos(rad)*(r+23),cy+Math.sin(rad)*(r+23));bctx.lineTo(cx+Math.cos(rad)*(r+(a%30===0?32:26)),cy+Math.sin(rad)*(r+(a%30===0?32:26)));bctx.stroke();}
    const glow=bctx.createRadialGradient(cx,cy,r*.92,cx,cy,r*1.1);glow.addColorStop(0,'#79b9fb00');glow.addColorStop(.46,'#71b5fb19');glow.addColorStop(1,'#79b9fb00');bctx.fillStyle=glow;bctx.beginPath();bctx.arc(cx,cy,r*1.1,0,Math.PI*2);bctx.fill();
    const ocean=bctx.createRadialGradient(cx-r*.35,cy-r*.35,r*.08,cx,cy,r);ocean.addColorStop(0,'#185792');ocean.addColorStop(.7,'#06457f');ocean.addColorStop(1,'#002b5c');
    bctx.beginPath();path({type:'Sphere'});bctx.fillStyle=ocean;bctx.fill();bctx.strokeStyle='#c6e0ff80';bctx.lineWidth=.9;bctx.stroke();
    bctx.beginPath();path(graticule);bctx.strokeStyle='#bedbfa22';bctx.lineWidth=.6;bctx.stroke();
    if(world){
      bctx.beginPath();path(world);bctx.fillStyle='#83b4e12b';bctx.fill();
      const tile=document.createElement('canvas');tile.width=tile.height=5;const t=tile.getContext('2d');t.fillStyle='#d9ecff68';t.beginPath();t.arc(2.5,2.5,.6,0,Math.PI*2);t.fill();
      bctx.fillStyle=bctx.createPattern(tile,'repeat');bctx.fill();bctx.strokeStyle='#d7eaff80';bctx.lineWidth=.75;bctx.stroke();
      bctx.beginPath();path(borders);bctx.strokeStyle='#e2f0ff32';bctx.lineWidth=.45;bctx.stroke();
    }
    $('viewCoords').textContent=coordinateLabel(view);
  }
  function draw(now=performance.now()){
    if(!projection)return;
    ctx.clearRect(0,0,width,height);ctx.drawImage(base,0,0,base.width,base.height,0,0,width,height);
    if(!point||d3.geoDistance(point,view)>Math.PI/2)return;
    const p=projection(point),x=p[0],y=p[1];
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,radius*zoom,0,Math.PI*2);ctx.clip();
    if(hasResult){
      const elapsed=(now-effectStart)/1000,progress=reducedMotion?1:Math.min(elapsed/2.2,1);
      const size=Math.min(radius*.18,68)*zoom;
      for(let i=3;i>=1;i--){ctx.beginPath();ctx.ellipse(x,y,size*i/3*progress,size*i/3*.64*progress,-.25,0,Math.PI*2);ctx.fillStyle=`rgba(220,240,255,${.04+(3-i)*.025})`;ctx.fill();ctx.strokeStyle=`rgba(235,246,255,${.3+(3-i)*.15})`;ctx.lineWidth=.8;ctx.stroke();}
      if(elapsed<1.8&&!reducedMotion){ctx.beginPath();ctx.arc(x,y,5+elapsed*45,0,Math.PI*2);ctx.strokeStyle=`rgba(255,255,255,${Math.max(0,.7-elapsed*.4)})`;ctx.stroke();}
    }
    ctx.strokeStyle='#f1f7ffb0';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-17,y);ctx.lineTo(x-7,y);ctx.moveTo(x+7,y);ctx.lineTo(x+17,y);ctx.moveTo(x,y-17);ctx.lineTo(x,y-7);ctx.moveTo(x,y+7);ctx.lineTo(x,y+17);ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
    ctx.beginPath();ctx.moveTo(x+13,y-13);ctx.lineTo(x+29,y-29);ctx.lineTo(x+98,y-29);ctx.strokeStyle='#d8eaff70';ctx.stroke();ctx.font='8px Consolas,monospace';ctx.fillStyle='#e1efff';ctx.fillText(`PUNTO ${String(pointCount).padStart(2,'0')}`,x+33,y-36);
    ctx.restore();
  }
  function animate(now=performance.now()){
    cancelAnimationFrame(raf);
    if(auto){const delta=Math.min(now-(lastTime||now),50);view[0]=(view[0]+delta*.004+540)%360-180;renderBase();}
    lastTime=now;draw(now);
    if(auto||(hasResult&&!reducedMotion&&now-effectStart<2400))raf=requestAnimationFrame(animate);else lastTime=0;
  }
  function setZoom(value){zoom=Math.max(.65,Math.min(2.2,value));renderBase();draw();}
  $('zoomIn').addEventListener('click',()=>setZoom(zoom+.15));$('zoomOut').addEventListener('click',()=>setZoom(zoom-.15));
  $('resetView').addEventListener('click',()=>{zoom=1;view=[15,23];auto=false;$('autoRotate').setAttribute('aria-pressed','false');renderBase();draw();});
  $('autoRotate').addEventListener('click',()=>{auto=!auto;$('autoRotate').setAttribute('aria-pressed',String(auto));animate();});
  canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom-e.deltaY*.001);},{passive:false});
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointerStart={x:e.clientX,y:e.clientY,view:[...view],id:e.pointerId};dragged=false;canvas.setPointerCapture(e.pointerId);auto=false;$('autoRotate').setAttribute('aria-pressed','false');});
  canvas.addEventListener('pointermove',e=>{if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>4)dragged=true;if(dragged){view=[((pointerStart.view[0]-dx*.22/zoom+540)%360)-180,Math.max(-85,Math.min(85,pointerStart.view[1]+dy*.22/zoom))];renderBase();draw();}});
  function placePoint(coords){point=[Math.max(-180,Math.min(180,coords[0])),Math.max(-90,Math.min(90,coords[1]))];pointCount++;resetResult();updatePoint();draw();notify('Punto colocado. La comunidad del ejercicio sigue siendo ficticia.');}
  canvas.addEventListener('pointerup',e=>{if(!pointerStart)return;if(!dragged&&projection){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(Math.hypot(x-cx,y-cy)<=radius*zoom){const coords=projection.invert([x,y]);if(coords&&coords.every(Number.isFinite))placePoint(coords);}}pointerStart=null;});
  canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
  canvas.addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Enter'];if(!keys.includes(e.key))return;e.preventDefault();auto=false;$('autoRotate').setAttribute('aria-pressed','false');if(e.key==='Enter')placePoint([...view]);else if(e.key==='+'||e.key==='=')setZoom(zoom+.15);else if(e.key==='-')setZoom(zoom-.15);else{view[0]=(view[0]+(e.key==='ArrowRight'?8:e.key==='ArrowLeft'?-8:0)+540)%360-180;view[1]=Math.max(-85,Math.min(85,view[1]+(e.key==='ArrowUp'?8:e.key==='ArrowDown'?-8:0)));renderBase();draw();}});
  new ResizeObserver(resize).observe(canvas);
  renderCatalog();resize();updatePoint();
  fetch('assets/world.json').then(r=>{if(!r.ok)throw Error('cartography');return r.json();}).then(data=>{world=topojson.feature(data,data.objects.countries);borders=topojson.mesh(data,data.objects.countries,(a,b)=>a!==b);$('globeLoading').hidden=true;renderBase();draw();updatePoint();}).catch(()=>{$('globeLoading').textContent='No se pudo cargar el mapa. Recarga la página para reintentar.';notify('La cartografía no está disponible. Recarga para reintentar.');});
})();
