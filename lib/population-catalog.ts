import serviceCatalog from '../data/population/service-catalog.json';

type CountryDataset=(typeof serviceCatalog.population.datasets)[number];
type AdminLayer=(typeof serviceCatalog.boundaries.adminLayers)[number];
const populationDatasets=new Map(serviceCatalog.population.datasets.map((record)=>[record.countryCode,record]));
const adminLayersByKey=new Map(serviceCatalog.boundaries.adminLayers.map((record)=>[`${record.countryCode}:${record.level}`,record]));
const adminLayersById=new Map(serviceCatalog.boundaries.adminLayers.map((record)=>[record.boundaryId,record]));
let integrityCheck:Promise<boolean>|undefined;

async function sha256(value:unknown){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export const populationEdition=`${serviceCatalog.population.release}-${serviceCatalog.population.releaseVersion}-${serviceCatalog.population.year}-${serviceCatalog.population.resolution}`;
export const populationCatalogSummary={
  provider:serviceCatalog.population.provider,
  release:serviceCatalog.population.release,
  version:serviceCatalog.population.releaseVersion,
  year:serviceCatalog.population.year,
  resolution:serviceCatalog.population.resolution,
  units:'people_per_grid_cell' as const,
  crs:serviceCatalog.population.crs,
  noDataValue:serviceCatalog.population.noDataValue,
  licensing:serviceCatalog.population.licensing,
  doi:serviceCatalog.population.doi,
  maxAreaKm2:serviceCatalog.population.anonymousMaximumAreaKm2,
  unavailableCountryCodes:serviceCatalog.population.unavailableCountryCodes,
  manifestSha256:serviceCatalog.manifestSha256
};
export const populationBoundaryCoverageSummary=serviceCatalog.boundaries.countryCoverage;

export function populationDataset(countryCode:string):CountryDataset|undefined{return populationDatasets.get(countryCode);}
export function adminLayer(countryCode:string,level:'ADM0'|'ADM1'|'ADM2'='ADM0'):AdminLayer|undefined{return adminLayersByKey.get(`${countryCode}:${level}`);}
export function admin0Layer(countryCode:string):AdminLayer|undefined{return adminLayer(countryCode,'ADM0');}
export function adminLayerById(boundaryId:string):AdminLayer|undefined{return adminLayersById.get(boundaryId);}
export function adminLayersForCountry(countryCode:string){return serviceCatalog.boundaries.adminLayers.filter((record)=>record.countryCode===countryCode);}
export function populationCountryCodes(){return [...populationDatasets.keys()].sort();}
export function populationCountryAvailable(countryCode:string){return populationDatasets.has(countryCode);}

export function verifyPopulationCatalog(){
  integrityCheck??=(async()=>{
    const {manifestSha256,...payload}=serviceCatalog;
    return await sha256(payload)===manifestSha256;
  })();
  return integrityCheck;
}
