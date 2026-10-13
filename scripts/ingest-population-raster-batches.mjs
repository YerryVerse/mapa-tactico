import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(resolve(root,'data/population/catalog.json'),'utf8'));
const args=process.argv.slice(2),selectedCountries=[];
let workers=3,onlyWorker;
for(let index=0;index<args.length;index++){
  if(args[index]==='--workers'&&/^\d+$/.test(args[index+1]??''))workers=Number(args[++index]);
  else if(args[index]==='--worker'&&/^\d+$/.test(args[index+1]??''))onlyWorker=Number(args[++index]);
  else if(args[index]==='--country'&&args[index+1])selectedCountries.push(args[++index].toUpperCase());
  else throw new Error('Usage: node scripts/ingest-population-raster-batches.mjs [--workers 1-8] [--worker 1-N] [--country ISO3]...');
}
if(!Number.isInteger(workers)||workers<1||workers>8)throw new Error('Worker count must be from 1 to 8');
if(onlyWorker!==undefined&&(!Number.isInteger(onlyWorker)||onlyWorker<1||onlyWorker>workers))throw new Error('Selected worker must be within the configured worker count');
const datasets=catalog.population.datasets.filter(item=>selectedCountries.length===0||selectedCountries.includes(item.countryCode));
if(!datasets.length||selectedCountries.some(code=>!datasets.some(item=>item.countryCode===code)))throw new Error('At least one selected country has no pinned WorldPop dataset.');
const batches=Array.from({length:Math.min(workers,datasets.length)},()=>[]);
datasets.forEach((dataset,index)=>batches[index%batches.length].push(dataset.countryCode));
if(onlyWorker!==undefined&&onlyWorker>batches.length)throw new Error('Selected worker has no countries in this batch');
const script=resolve(root,'scripts/ingest-population-raster.mjs');
const selectedBatches=batches.map((countries,index)=>({countries,index})).filter(batch=>onlyWorker===undefined||batch.index+1===onlyWorker);
const results=await Promise.allSettled(selectedBatches.map(({countries,index})=>new Promise((resolveBatch,rejectBatch)=>{
  process.stdout.write(`Worker ${index+1}/${batches.length}: ${countries.length} países\n`);
  const child=spawn(process.execPath,[script,...countries.flatMap(code=>['--country',code])],{cwd:root,stdio:'inherit',windowsHide:true});
  child.once('error',rejectBatch);
  child.once('exit',(code,signal)=>code===0?resolveBatch():rejectBatch(new Error(`Worker ${index+1} ended with ${signal??`exit ${code}`}`)));
})));
const failures=results.filter(result=>result.status==='rejected');
if(failures.length){for(const failure of failures)process.stderr.write(`${failure.reason instanceof Error?failure.reason.message:String(failure.reason)}\n`);process.exitCode=1;}
else{
  const completedCountries=selectedBatches.reduce((total,batch)=>total+batch.countries.length,0);
  process.stdout.write(`Prepared and independently verified ${completedCountries} official WorldPop raster dataset(s) (${selectedBatches.length}/${batches.length} worker(s) completed).\n`);
}
