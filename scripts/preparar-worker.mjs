import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';
const pkg=JSON.parse(readFileSync('node_modules/maplibre-gl/package.json','utf8'));
if(pkg.version!=='6.13.0')throw new Error('Revalidar versión del motor antes de cambiar el worker');
mkdirSync('public/map-worker',{recursive:true});
// Static package asset bypasses dev-only window/HMR injection into this module worker.
copyFileSync('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs','public/map-worker/maplibre-gl-worker-6.13.0.mjs');
