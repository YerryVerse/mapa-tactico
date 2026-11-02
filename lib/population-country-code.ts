import countryCodes from '../data/population/country-alpha2-to-alpha3.json';
const alpha3ToAlpha2=new Map(Object.entries(countryCodes as Record<string,string>).map(([alpha2,alpha3])=>[alpha3,alpha2]));

/** Resolve the search service's ISO-3166-1 alpha-2 code to the population catalog's alpha-3 country code. */
export function populationCountryCode(countryCode:string){
  const alpha2=countryCode.trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(alpha2))return undefined;
  return (countryCodes as Record<string,string>)[alpha2];
}

export function populationCountryAlpha2(countryCode:string){
  const alpha3=countryCode.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(alpha3)?alpha3ToAlpha2.get(alpha3):undefined;
}

export function populationBoundaryLevel(kind:'country'|'city'){
  return kind==='country'?'ADM0':'ADM2';
}
