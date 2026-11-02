import { describe, it, expect } from 'vitest';
import { calculateBlastRadii, createGeodesicCircle, estimateCasualties } from '../../lib/blast-physics';

describe('Blast physics and vulnerability engine', () => {
  it('calculates proportional blast radii for small, medium, and catastrophic yields', () => {
    // 0.001 tonnes (1 kg TNT)
    const small = calculateBlastRadii(0.001);
    expect(small.radius20psiKm).toBeCloseTo(0.004, 3); // ~4 meters
    expect(small.radius5psiKm).toBeCloseTo(0.0085, 4); // ~8.5 meters
    expect(small.radius1psiKm).toBeCloseTo(0.022, 3);  // ~22 meters
    expect(small.thermalRadiusKm).toBe(0);

    // 15,000 tonnes (Hiroshima: 15 kt)
    const hiroshima = calculateBlastRadii(15000);
    // 15^(1/3) ≈ 2.466
    expect(hiroshima.radius20psiKm).toBeCloseTo(0.40 * 2.466, 2); // ~0.98 km
    expect(hiroshima.radius5psiKm).toBeCloseTo(0.85 * 2.466, 2);  // ~2.10 km
    expect(hiroshima.radius1psiKm).toBeCloseTo(2.20 * 2.466, 2);  // ~5.43 km
    expect(hiroshima.thermalRadiusKm).toBeGreaterThan(3.0);       // ~3.65 km

    // Chicxulub (100,000,000,000,000 tonnes)
    const chicxulub = calculateBlastRadii(1e14);
    expect(chicxulub.radius20psiKm).toBeGreaterThan(1500);
    expect(chicxulub.radius1psiKm).toBeCloseTo(10211.5, 0);
  });

  it('generates valid GeoJSON geodesic circle polygons', () => {
    const circle = createGeodesicCircle(0, 0, 10, 16);
    expect(circle.type).toBe('Polygon');
    expect(circle.coordinates[0].length).toBe(17); // 16 steps + closing vertex
    // Center point is inside polygon bounds
    const lats = circle.coordinates[0].map(pt => pt[1]);
    expect(Math.max(...lats)).toBeGreaterThan(0);
    expect(Math.min(...lats)).toBeLessThan(0);
  });

  it('estimates fatalities and injuries within population bounds', () => {
    const pop20 = 1000;
    const pop5 = 5000;
    const pop1 = 10000;

    const result = estimateCasualties(pop20, pop5, pop1);
    expect(result.totalExposed).toBe(16000);
    expect(result.fatalities).toBe(1000 + 2500 + 500); // 4000
    expect(result.injuries).toBe(2000 + 2500);         // 4500
    expect(result.fatalities + result.injuries).toBeLessThanOrEqual(result.totalExposed);
  });
});
