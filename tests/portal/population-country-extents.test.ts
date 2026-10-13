import {describe,it,expect} from 'vitest';
import type {PopulationGeometry} from '../../lib/population-contract';
import {normalizePopulationGeometry} from '../../lib/population-geometry';
import {populationCountryAvailability,populationCountryCandidates} from '../../lib/population-country-extents';

function rectangle(west:number,south:number,east:number,north:number):PopulationGeometry{
  return {type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]};
}

describe('population country extent index',()=>{
  it('keeps a small London area in its country instead of mistaking the map camera for the geometry',()=>{
    expect(populationCountryCandidates(rectangle(-.2,51.4,-.1,51.6)).countryCodes).toEqual(['GBR']);
  });
  it('finds both supported countries for a polygon around the Germany–Poland border',()=>{
    const codes=populationCountryCandidates(rectangle(14.2,51.0,14.4,51.2)).countryCodes;
    expect(codes).toContain('DEU');expect(codes).toContain('POL');
  });
  it('carries unsupported territories into coverage checks rather than returning a false zero',()=>{
    const codes=populationCountryCandidates(rectangle(12.449,41.899,12.456,41.906)).countryCodes;
    expect(codes).toContain('VAT');expect(codes).toContain('ITA');
    expect(populationCountryAvailability('VAT')).toBe(false);
  });
  it('maps a date-line area into country candidates from both sides of the world copy',()=>{
    const geometry=normalizePopulationGeometry(rectangle(179.5,-17,-179.5,-16));
    expect(populationCountryCandidates(geometry).countryCodes).toContain('FJI');
  });
});
