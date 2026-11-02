import { describe, it, expect } from 'vitest';
import { calculateBlastDemographics } from '../../lib/blast-demographics';

describe('Blast Demographics & Demographic Realism', () => {
  it('strictly respects Dominican Republic total population for Tsar Bomba', () => {
    // Santo Domingo coordinates: -69.89232, 18.47186
    const result = calculateBlastDemographics(-69.89232, 18.47186, 50000000); // 50 Mt Tsar Bomba

    expect(result.countriesAffected).toContain('DOM');
    // Total Dominican Republic population is ~11.46M.
    // Exposed population within ~81 km of Santo Domingo must be realistic (around 5M - 6M) and CANNOT exceed 11.46M!
    expect(result.totalExposed).toBeLessThanOrEqual(11462003);
    expect(result.totalExposed).toBeGreaterThan(3000000);
    expect(result.totalExposed).toBeLessThan(7000000);

    // Fatalities and injuries must be strictly bounded
    expect(result.fatalities).toBeGreaterThan(0);
    expect(result.fatalities).toBeLessThanOrEqual(result.totalExposed);
    expect(result.fatalities + result.injuries).toBeLessThanOrEqual(result.totalExposed);
  });

  it('reports zero casualties for detonations in the open ocean far from land', () => {
    // Middle of the Atlantic Ocean: (-30, 25)
    const oceanResult = calculateBlastDemographics(-30, 25, 50000000);

    expect(oceanResult.totalExposed).toBe(0);
    expect(oceanResult.fatalities).toBe(0);
    expect(oceanResult.injuries).toBe(0);
    expect(oceanResult.countriesAffected).toHaveLength(0);
  });

  it('computes realistic scale for Beirut port explosion', () => {
    // Beirut Port coordinates: 35.5186, 33.9014 (1,200 t TNT)
    const result = calculateBlastDemographics(35.5186, 33.9014, 1200);

    expect(result.countriesAffected).toContain('LBN');
    expect(result.totalExposed).toBeGreaterThan(0);
    expect(result.fatalities).toBeGreaterThan(0);
    expect(result.injuries).toBeGreaterThan(0);
    expect(result.fatalities + result.injuries).toBeLessThanOrEqual(result.totalExposed);
  });

  it('handles small propane tank yields cleanly without negative numbers or overflow', () => {
    const result = calculateBlastDemographics(-69.89232, 18.47186, 0.00001);

    expect(result.totalExposed).toBeGreaterThanOrEqual(0);
    expect(result.fatalities).toBeGreaterThanOrEqual(0);
    expect(result.injuries).toBeGreaterThanOrEqual(0);
  });
});
