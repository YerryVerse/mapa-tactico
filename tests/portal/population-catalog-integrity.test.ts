import {describe,it,expect} from 'vitest';
import sourceCatalog from '../../data/population/catalog.json';
import serviceCatalog from '../../data/population/service-catalog.json';

const sourceLayers=sourceCatalog.boundaries.layers;
const serviceLayers=serviceCatalog.boundaries.adminLayers;

describe('generated administrative boundary catalog integrity',()=>{
  it('keeps layer IDs aligned with their country and administrative level',()=>{
    for(const layer of sourceLayers)expect(layer.boundaryId).toMatch(new RegExp(`^${layer.countryCode}-${layer.level}-`));
    for(const layer of serviceLayers)expect(layer.boundaryId).toMatch(new RegExp(`^${layer.countryCode}-${layer.level}-`));
  });

  it('has no duplicate country-level source and publishes the same layer IDs at runtime',()=>{
    const sourceKeys=sourceLayers.map(layer=>`${layer.countryCode}:${layer.level}:${layer.geoJsonUrl}`);
    const serviceKeys=serviceLayers.map(layer=>`${layer.countryCode}:${layer.level}:${layer.geoJsonUrl}`);
    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);
    expect(new Set(serviceKeys).size).toBe(serviceKeys.length);
    expect(serviceLayers.map(layer=>layer.boundaryId).sort()).toEqual(sourceLayers.map(layer=>layer.boundaryId).sort());
  });

  it('keeps India without ADM0 and preserves its single ADM1 source with 36 units',()=>{
    const indiaSource=sourceLayers.filter(layer=>layer.countryCode==='IND');
    const indiaService=serviceLayers.filter(layer=>layer.countryCode==='IND');
    expect(indiaSource.filter(layer=>layer.level==='ADM0')).toHaveLength(0);
    expect(indiaSource.filter(layer=>layer.level==='ADM1')).toMatchObject([{boundaryId:'IND-ADM1-1811400',unitCount:36}]);
    expect(indiaSource.filter(layer=>layer.level==='ADM1')).toHaveLength(1);
    expect(indiaService.filter(layer=>layer.level==='ADM0')).toHaveLength(0);
    expect(serviceCatalog.boundaries.countryCoverage.countriesWithoutADM0CountryCodes).toContain('IND');
  });
});
