import {describe,it,expect} from 'vitest';
import serviceCatalog from '../../data/population/service-catalog.json';
import {populationAdmin2CountryCode} from '../../lib/population-country-code';

describe('population ADM2 country lookup',()=>{
  it('maps supported city-search country codes to the pinned ADM2 catalog',()=>{
    expect(populationAdmin2CountryCode('GB')).toBe('GBR');
    expect(populationAdmin2CountryCode('us')).toBe('USA');
    expect(populationAdmin2CountryCode('IN')).toBe('IND');
    expect(populationAdmin2CountryCode('BO')).toBe('BOL');
  });

  it('does not invent a boundary for malformed or uncatalogued countries',()=>{
    expect(populationAdmin2CountryCode('')).toBeUndefined();
    expect(populationAdmin2CountryCode('ZZ')).toBeUndefined();
    expect(populationAdmin2CountryCode('GBR')).toBeUndefined();
  });

  it('resolves every ADM2 country represented in the pinned catalog',()=>{
    const entities=require('../../content/geography/entities.json') as Array<{countryCode:string|null}>;
    const codeByAlpha3=new Map(entities.flatMap(entity=>entity.countryCode?[ [populationAdmin2CountryCode(entity.countryCode),entity.countryCode] ]:[]));
    const mapped=new Set(codeByAlpha3.keys());
    const unresolved=serviceCatalog.boundaries.adminLayers.filter(layer=>layer.level==='ADM2'&&!mapped.has(layer.countryCode)).map(layer=>layer.countryCode);
    expect(unresolved).toEqual([]);
  });
});
