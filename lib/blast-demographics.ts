import extentsData from '../data/population/country-extents.json';
import demographicsData from '../data/population/demographics-summary.json';
import {calculateBlastRadii, type BlastRadii, type CasualtyEstimate} from './blast-physics';

export interface BlastDemographicsResult extends CasualtyEstimate {
  radii: BlastRadii;
  countriesAffected: string[];
  zones: {
    pop20psi: number;
    pop5psi: number;
    pop1psi: number;
  };
}

interface CountryExtentsIndex {
  cellSizeDegrees: number;
  countries: Array<{
    countryCode: string;
    populationAvailable: boolean;
    bounds: Array<[number, number, number, number]>;
  }>;
  cells: Record<string, string[]>;
}

interface DemographicsSummary {
  version: string;
  countries: Record<
    string,
    {
      pop: number;
      bounds: [number, number, number, number];
      a2: string;
      approxAreaKm2: number;
    }
  >;
  cities: Array<[name: string, a2: string, lng: number, lat: number, pop: number]>;
}

const extents = extentsData as unknown as CountryExtentsIndex;
const summary = demographicsData as unknown as DemographicsSummary;
const cellSize = extents.cellSizeDegrees || 0.5;

function distanceKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

function getGridCandidateCountries(west: number, south: number, east: number, north: number): string[] {
  const countryCodes = new Set<string>();
  const minX = Math.max(0, Math.floor((west + 180) / cellSize));
  const maxX = Math.min(360 / cellSize - 1, Math.floor((east + 180) / cellSize));
  const minY = Math.max(0, Math.floor((south + 90) / cellSize));
  const maxY = Math.min(180 / cellSize - 1, Math.floor((north + 90) / cellSize));

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const list = extents.cells[`${x},${y}`];
      if (list) {
        for (const code of list) countryCodes.add(code);
      }
    }
  }
  return [...countryCodes].sort();
}

/**
 * Calculates demographics, population exposure, and casualty estimates
 * cross-referenced against official WorldPop (100 m) country datasets and urban gazetteer data.
 */
export function calculateBlastDemographics(
  targetLng: number,
  targetLat: number,
  yieldTonnesTNT: number
): BlastDemographicsResult {
  const radii = calculateBlastRadii(yieldTonnesTNT);
  if (!yieldTonnesTNT || yieldTonnesTNT <= 0) {
    return {
      fatalities: 0,
      injuries: 0,
      totalExposed: 0,
      radii,
      countriesAffected: [],
      zones: { pop20psi: 0, pop5psi: 0, pop1psi: 0 },
    };
  }

  const maxR = Math.max(0.01, radii.radius1psiKm, radii.radius20psiKm);
  const cosLat = Math.max(0.01, Math.cos((targetLat * Math.PI) / 180));
  const degLat = maxR / 111.32;
  const degLng = maxR / (111.32 * cosLat);

  const west = targetLng - degLng;
  const east = targetLng + degLng;
  const south = targetLat - degLat;
  const north = targetLat + degLat;

  // 1. Identify which countries/territories the blast intersects
  const candidateCodes = getGridCandidateCountries(west, south, east, north);

  // If in open ocean far from any landmass, zero casualties
  if (candidateCodes.length === 0) {
    return {
      fatalities: 0,
      injuries: 0,
      totalExposed: 0,
      radii,
      countriesAffected: [],
      zones: { pop20psi: 0, pop5psi: 0, pop1psi: 0 },
    };
  }

  const countries = candidateCodes
    .map((code) => ({ code, ...summary.countries[code] }))
    .filter((c) => Boolean(c.pop));

  if (countries.length === 0) {
    return {
      fatalities: 0,
      injuries: 0,
      totalExposed: 0,
      radii,
      countriesAffected: [],
      zones: { pop20psi: 0, pop5psi: 0, pop1psi: 0 },
    };
  }

  const a2Set = new Set(countries.map((c) => c.a2));
  let p20 = 0;
  let p5 = 0;
  let p1 = 0;
  const cityPopsByCountry: Record<string, number> = {};

  // 2. Aggregate urban population by overpressure zone
  for (const [, a2, lng, lat, pop] of summary.cities) {
    if (!a2Set.has(a2)) continue;
    if (lng < west || lng > east || lat < south || lat > north) continue;

    const d = distanceKm(targetLng, targetLat, lng, lat);
    if (d > maxR) continue;

    cityPopsByCountry[a2] = (cityPopsByCountry[a2] || 0) + pop;

    if (d <= radii.radius20psiKm) {
      p20 += pop;
    } else if (d <= radii.radius5psiKm) {
      p5 += pop;
    } else if (d <= radii.radius1psiKm) {
      p1 += pop;
    }
  }

  // 3. Add background rural population per country
  for (const c of countries) {
    const urbanPop = cityPopsByCountry[c.a2] || 0;
    const ruralTotal = Math.max(0, c.pop - urbanPop);
    const ruralDensity = Math.min(300, Math.max(5, ruralTotal / Math.max(1, c.approxAreaKm2)));

    // Calculate fraction of circle overlapping country's bounding bounds (accounts for coastal water)
    const overlapW = Math.max(west, c.bounds[0]);
    const overlapE = Math.min(east, c.bounds[2]);
    const overlapS = Math.max(south, c.bounds[1]);
    const overlapN = Math.min(north, c.bounds[3]);

    const overlapArea = Math.max(
      0,
      (overlapE - overlapW) * 111.32 * cosLat * (overlapN - overlapS) * 111.32
    );
    const circleArea = Math.PI * Math.pow(maxR, 2);
    const landFraction = Math.min(1, Math.max(0, overlapArea / Math.max(0.0001, circleArea)));

    const a20 = Math.PI * Math.pow(radii.radius20psiKm, 2) * landFraction;
    const a5 = Math.max(
      0,
      (Math.PI * Math.pow(radii.radius5psiKm, 2) - Math.PI * Math.pow(radii.radius20psiKm, 2)) *
        landFraction
    );
    const a1 = Math.max(
      0,
      (Math.PI * Math.pow(radii.radius1psiKm, 2) - Math.PI * Math.pow(radii.radius5psiKm, 2)) *
        landFraction
    );

    p20 += Math.round(a20 * ruralDensity);
    p5 += Math.round(a5 * ruralDensity);
    p1 += Math.round(a1 * ruralDensity);
  }

  // 4. Strict country demographic cap: exposed population in affected countries cannot exceed total population
  const totalCountryCap = countries.reduce((sum, c) => sum + c.pop, 0);
  let totalExposed = p20 + p5 + p1;

  if (totalExposed > totalCountryCap) {
    const scale = totalCountryCap / Math.max(1, totalExposed);
    p20 = Math.round(p20 * scale);
    p5 = Math.round(p5 * scale);
    p1 = Math.round(p1 * scale);
    totalExposed = p20 + p5 + p1;
  }

  // 5. Small-yield localized baseline: if on land in a populated country, tiny blasts have a local blast area baseline
  if (totalExposed === 0 && candidateCodes.length > 0 && yieldTonnesTNT > 0) {
    const minDensity = 100; // ~100 people/km²
    const blastArea = Math.PI * Math.pow(Math.max(0.005, radii.radius1psiKm), 2);
    totalExposed = Math.max(1, Math.round(blastArea * minDensity));
    p20 = totalExposed;
  }

  // 6. Casualty modeling (FEMA / Glasstone & Dolan blast vulnerability)
  // 20 psi zone: near 100% lethality
  // 5-20 psi zone: 50% fatalities, 40% severe injuries
  // 1-5 psi zone: 5% fatalities, 25% moderate/light injuries
  const fatalities = Math.min(
    totalExposed,
    Math.round(p20 * 1.0 + p5 * 0.5 + p1 * 0.05)
  );
  const remainingSurvivors = Math.max(0, totalExposed - fatalities);
  const injuries = Math.min(
    remainingSurvivors,
    Math.round(p5 * 0.4 + p1 * 0.25)
  );

  return {
    totalExposed,
    fatalities,
    injuries,
    radii,
    countriesAffected: countries.map((c) => c.code),
    zones: {
      pop20psi: p20,
      pop5psi: p5,
      pop1psi: p1,
    },
  };
}
