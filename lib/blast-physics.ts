export interface BlastRadii {
  radius20psiKm: number;
  radius5psiKm: number;
  radius1psiKm: number;
  thermalRadiusKm: number;
}

export interface CasualtyEstimate {
  fatalities: number;
  injuries: number;
  totalExposed: number;
}

/**
 * Calculates scaled blast overpressure radii using Hopkinson-Cranz scaling laws:
 * R = lambda * W^(1/3)
 * @param yieldTonnes TNT equivalent yield in tonnes
 */
export function calculateBlastRadii(yieldTonnes: number): BlastRadii {
  if (yieldTonnes <= 0 || !Number.isFinite(yieldTonnes)) {
    return { radius20psiKm: 0, radius5psiKm: 0, radius1psiKm: 0, thermalRadiusKm: 0 };
  }

  // Convert tonnes of TNT to kilotons (kt)
  const yieldKt = yieldTonnes / 1000;
  const cubeRootKt = Math.cbrt(yieldKt);

  // Scaled distance constants (km / kt^(1/3))
  // 20 psi (138 kPa): Complete demolition, near 100% lethality
  const lambda20psi = 0.40;
  // 5 psi (34 kPa): Most residential structures collapse, widespread fires
  const lambda5psi = 0.85;
  // 1 psi (7 kPa): Window shattering, skin cuts, commercial distortion
  const lambda1psi = 2.20;

  let r20 = lambda20psi * cubeRootKt;
  let r5 = lambda5psi * cubeRootKt;
  let r1 = lambda1psi * cubeRootKt;

  // Thermal radiation (3rd degree burns)
  // For small non-nuclear explosions (< 0.1 kt), thermal pulse is largely contained within blast.
  let rThermal = 0;
  if (yieldKt >= 0.1) {
    rThermal = 1.20 * Math.pow(yieldKt, 0.41);
  }

  // Earth's maximum hemisphere radius cap (approx 20,000 km) for planetary events like Chicxulub
  const maxEarthRadiusKm = 20000;
  r20 = Math.min(r20, maxEarthRadiusKm);
  r5 = Math.min(r5, maxEarthRadiusKm);
  r1 = Math.min(r1, maxEarthRadiusKm);
  rThermal = Math.min(rThermal, maxEarthRadiusKm);

  return {
    radius20psiKm: r20,
    radius5psiKm: r5,
    radius1psiKm: r1,
    thermalRadiusKm: rThermal,
  };
}

/**
 * Calculates the optimal MapLibre camera zoom level to fit the blast radius on screen.
 */
export function calculateOptimalZoom(maxRadiusKm: number): number {
  if (maxRadiusKm <= 0.05) return 17; // small propane tank (e.g. 20m)
  if (maxRadiusKm <= 0.5) return 15;  // 500 kg
  if (maxRadiusKm <= 2) return 13.5;  // 1-2 km
  if (maxRadiusKm <= 10) return 11.5; // Hiroshima / Nagasaki
  if (maxRadiusKm <= 35) return 9.5;  // Tactical / medium nuclear
  if (maxRadiusKm <= 120) return 7.2; // Tsar Bomba (101 km)
  if (maxRadiusKm <= 300) return 5.8;
  if (maxRadiusKm <= 1500) return 4.0;
  return 2.0;                         // Chicxulub / planetary
}

/**
 * Generates a GeoJSON Polygon representing a geodesic circle.
 * Generates vertices in counter-clockwise order (RFC 7946 standard) so MapLibre GL
 * properly recognizes the interior in both flat and globe projections.
 * @param centerLng Center longitude in degrees (-180 to 180)
 * @param centerLat Center latitude in degrees (-90 to 90)
 * @param radiusKm Radius in kilometers
 * @param steps Number of polygon vertices (default 64)
 */
export function createGeodesicCircle(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  steps = 64
): GeoJSON.Polygon {
  const coordinates: [number, number][] = [];
  const earthRadiusKm = 6371.0088;
  const angularDistance = Math.min(radiusKm, earthRadiusKm * Math.PI) / earthRadiusKm;

  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;

  // Counter-clockwise generation (bearing from 2*PI down to 0) to ensure RFC 7946 compliance
  for (let i = steps; i >= 0; i--) {
    const bearing = (i * 2 * Math.PI) / steps;
    const ptLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const ptLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(ptLat)
      );

    const degLat = (ptLat * 180) / Math.PI;
    let degLng = (ptLng * 180) / Math.PI;
    // Normalize longitude between -180 and 180
    degLng = ((((degLng + 180) % 360) + 360) % 360) - 180;

    coordinates.push([Number(degLng.toFixed(6)), Number(degLat.toFixed(6))]);
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Distributes total population across concentric blast zones based on annular area fractions.
 */
export function calculateZonePopulations(totalPop: number, radii: BlastRadii) {
  if (totalPop <= 0) return { pop20: 0, pop5: 0, pop1: 0 };
  const a20 = Math.PI * Math.pow(radii.radius20psiKm, 2);
  const a5 = Math.PI * Math.pow(radii.radius5psiKm, 2);
  const a1 = Math.PI * Math.pow(radii.radius1psiKm, 2);
  const totalArea = Math.max(0.000001, a1);

  const frac1 = Math.min(1, a20 / totalArea);
  const frac2 = Math.min(1 - frac1, Math.max(0, (a5 - a20) / totalArea));
  const frac3 = Math.max(0, 1 - frac1 - frac2);

  const pop20 = Math.round(totalPop * frac1);
  const pop5 = Math.round(totalPop * frac2);
  const pop1 = Math.round(totalPop * frac3);

  return { pop20, pop5, pop1 };
}

/**
 * Estimates fatalities and injuries based on FEMA / Glasstone & Dolan blast vulnerability models.
 * @param pop20psi Population residing in the 20 psi zone
 * @param pop5to20psi Population residing between 5 psi and 20 psi
 * @param pop1to5psi Population residing between 1 psi and 5 psi
 */
export function estimateCasualties(
  pop20psi: number,
  pop5to20psi: number,
  pop1to5psi: number
): CasualtyEstimate {
  const p1 = Math.max(0, pop20psi);
  const p2 = Math.max(0, pop5to20psi);
  const p3 = Math.max(0, pop1to5psi);

  // Vulnerability coefficients:
  // 20 psi: 100% fatalities
  // 5-20 psi: 50% fatalities, 40% injuries
  // 1-5 psi: 5% fatalities, 25% injuries
  const fatalities = Math.round(p1 * 1.0 + p2 * 0.50 + p3 * 0.05);
  const injuries = Math.round(p2 * 0.40 + p3 * 0.25);
  const totalExposed = Math.round(p1 + p2 + p3);

  return {
    fatalities: Math.min(fatalities, totalExposed),
    injuries: Math.min(injuries, totalExposed - Math.min(fatalities, totalExposed)),
    totalExposed,
  };
}
