import {describe,it,expect} from 'vitest';
import catalog from '../../data/population/catalog.json';
import serviceCatalog from '../../data/population/service-catalog.json';
import countryCodes from '../../data/population/country-alpha2-to-alpha3.json';
import entities from '../../content/geography/entities.json';
import {populationBoundaryLevel,populationCountryAlpha2,populationCountryCode} from '../../lib/population-country-code';

describe('population country and administrative-level lookup',()=>{
  it('maps supported city-search country codes to the pinned ADM2 catalog',()=>{
    expect(populationCountryCode('GB')).toBe('GBR');
    expect(populationCountryCode('us')).toBe('USA');
    expect(populationCountryCode('IN')).toBe('IND');
    expect(populationCountryCode('BO')).toBe('BOL');
    expect(populationCountryCode('AW')).toBe('ABW');
    expect(populationCountryCode('TT')).toBe('TTO');
  });

  it('does not invent a boundary for malformed or uncatalogued countries',()=>{
    expect(populationCountryCode('')).toBeUndefined();
    expect(populationCountryCode('ZZ')).toBeUndefined();
    expect(populationCountryCode('GBR')).toBeUndefined();
  });

  it('maps selected three-letter boundary codes back to localized country catalogs',()=>{
    expect(populationCountryAlpha2('DEU')).toBe('DE');
    expect(populationCountryAlpha2('deu')).toBe('DE');
    expect(populationCountryAlpha2('ZZZ')).toBeUndefined();
  });

  it('uses ADM0 for a country and ADM2 for a city',()=>{
    expect(populationBoundaryLevel('country')).toBe('ADM0');
    expect(populationBoundaryLevel('city')).toBe('ADM2');
  });

  it('resolves every ADM2 country represented in the pinned catalog',()=>{
    const codeByAlpha3=new Map(entities.flatMap(entity=>entity.countryCode?[ [populationCountryCode(entity.countryCode),entity.countryCode] ]:[]));
    const mapped=new Set(codeByAlpha3.keys());
    const unresolved=serviceCatalog.boundaries.adminLayers.filter(layer=>layer.level==='ADM2'&&!mapped.has(layer.countryCode)).map(layer=>layer.countryCode);
    expect(unresolved).toEqual([]);
  });

  it('maps every published population dataset and ADM0 boundary to an alpha-2 search result',()=>{
    const mapped=new Set(Object.values(countryCodes));
    expect(catalog.population.datasets.map(dataset=>dataset.countryCode).filter(code=>!mapped.has(code))).toEqual([]);
    expect(serviceCatalog.boundaries.adminLayers.filter(layer=>layer.level==='ADM0').map(layer=>layer.countryCode).filter(code=>!mapped.has(code))).toEqual([]);
  });
});
