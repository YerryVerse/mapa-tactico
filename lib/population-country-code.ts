import countryCodes from '../data/population/country-alpha2-to-alpha3.json';

/** Resolve the city search service's ISO-3166-1 alpha-2 code to a country with a pinned ADM2 layer. */
export function populationAdmin2CountryCode(countryCode:string){
  const alpha2=countryCode.trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(alpha2))return undefined;
  return (countryCodes as Record<string,string>)[alpha2];
}
