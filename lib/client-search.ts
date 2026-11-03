import {searchCountries,searchCities,shardPath} from './gazetteer';
import {validatedPlaces,type SearchPlace} from './search-contract';

export async function clientSearch(q: string, lang: string, limit = 10): Promise<SearchPlace[]> {
  const countries = searchCountries(q, lang);
  try {
    const relShard = await shardPath(q);
    const base = typeof document !== 'undefined' ? (document.baseURI || window.location.href) : 'http://127.0.0.1/';
    const cleanRel = relShard.startsWith('/') ? relShard.slice(1) : relShard;
    const shardUrl = new URL(cleanRel, base).href;
    const resp = await fetch(shardUrl);
    if (resp.ok) {
      const shardData = (await resp.json()) as unknown;
      const cities = searchCities(shardData, q, lang, limit);
      return validatedPlaces([...countries, ...cities].slice(0, 100), limit);
    }
  } catch {
    // Fall back to in-memory country search
  }
  return validatedPlaces(countries.slice(0, 100), limit);
}
