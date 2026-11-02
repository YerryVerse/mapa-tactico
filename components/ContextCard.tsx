'use client';
import {useEffect, useState} from 'react';
import {useLanguage} from './LanguageProvider';
import type {ContextEntry} from '../lib/scenario-contract';
import {calculateBlastRadii, type BlastRadii} from '../lib/blast-physics';
import {calculateBlastDemographics, type BlastDemographicsResult} from '../lib/blast-demographics';
import {number} from '../lib/locale-format';

function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km >= 10 ? km.toFixed(1) : km.toFixed(2)} km`;
}

export default function ContextCard({
  entry,
  onLocate,
  targetPoint,
}: {
  entry: ContextEntry;
  onLocate?: () => void;
  targetPoint?: { lng: number; lat: number } | null;
}) {
  const {language, t} = useLanguage();
  const [casualtyResult, setCasualtyResult] = useState<BlastDemographicsResult | null>(null);

  const radii = entry.yieldTonnesTNT ? calculateBlastRadii(entry.yieldTonnesTNT) : null;
  const isEs = language === 'es';

  // Calculate demographics and casualties whenever entry or target changes
  useEffect(() => {
    if (!radii || !entry.yieldTonnesTNT) {
      setCasualtyResult(null);
      return;
    }

    const center = targetPoint || (entry.location ? { lng: entry.location.lng, lat: entry.location.lat } : null);
    if (!center) {
      setCasualtyResult(null);
      return;
    }

    const res = calculateBlastDemographics(center.lng, center.lat, entry.yieldTonnesTNT);
    setCasualtyResult(res);
  }, [entry.id, entry.yieldTonnesTNT, targetPoint, entry.location]);

  return (
    <article className="context-card" data-entry-id={entry.id}>
      <header className="context-card-header">
        <span className="context-category-badge">{entry.category}</span>
        <h2>{entry.title}</h2>
      </header>

      <p>{entry.description}</p>

      {entry.yieldTonnesTNT !== undefined && (
        <section className="blast-specs" aria-label={isEs ? 'Especificaciones' : 'Specifications'}>
          <div className="blast-spec-row">
            <strong>{isEs ? 'Referencia energética:' : 'Energy equivalent:'}</strong>
            <span className="blast-spec-value">
              {number(language, entry.yieldTonnesTNT)} {isEs ? 'toneladas de TNT' : 'tonnes of TNT'}
            </span>
          </div>
          {entry.element && (
            <div className="blast-spec-row">
              <strong>{isEs ? 'Elemento / Combustible:' : 'Element / Fuel:'}</strong>
              <span>
                {entry.element} {entry.elementQuantity ? `(${entry.elementQuantity})` : ''}
              </span>
            </div>
          )}
        </section>
      )}

      {radii && (
        <section className="blast-radii-section" aria-label={isEs ? 'Radios de afectación' : 'Blast radii'}>
          <h3>{isEs ? 'Radios de afectación por sobrepresión' : 'Blast Overpressure Radii'}</h3>
          <ul className="blast-radii-list">
            <li className="blast-zone-item zone-20psi">
              <span className="blast-indicator" style={{ backgroundColor: '#ef4444' }} />
              <div className="blast-zone-info">
                <strong>20 psi (138 kPa): {formatDistance(radii.radius20psiKm)}</strong>
                <small>{isEs ? 'Demolición total, estructuras colapsadas' : 'Total demolition, heavy reinforced collapse'}</small>
              </div>
            </li>
            <li className="blast-zone-item zone-5psi">
              <span className="blast-indicator" style={{ backgroundColor: '#f97316' }} />
              <div className="blast-zone-info">
                <strong>5 psi (34 kPa): {formatDistance(radii.radius5psiKm)}</strong>
                <small>{isEs ? 'Colapso residencial, incendios generalizados' : 'Residential collapse, severe injuries and fires'}</small>
              </div>
            </li>
            <li className="blast-zone-item zone-1psi">
              <span className="blast-indicator" style={{ backgroundColor: '#eab308' }} />
              <div className="blast-zone-info">
                <strong>1 psi (7 kPa): {formatDistance(radii.radius1psiKm)}</strong>
                <small>{isEs ? 'Rotura masiva de cristales, daños menores' : 'Broken windows, flying glass lacerations'}</small>
              </div>
            </li>
            {radii.thermalRadiusKm > 0 && (
              <li className="blast-zone-item zone-thermal">
                <span className="blast-indicator" style={{ backgroundColor: '#a855f7' }} />
                <div className="blast-zone-info">
                  <strong>{isEs ? 'Pulso térmico:' : 'Thermal pulse:'} {formatDistance(radii.thermalRadiusKm)}</strong>
                  <small>{isEs ? 'Quemaduras de 3.er grado' : 'Third-degree thermal radiation burns'}</small>
                </div>
              </li>
            )}
          </ul>
        </section>
      )}

      {casualtyResult && (
        <section className="casualty-box" aria-label={isEs ? 'Estimación de víctimas' : 'Casualty estimate'}>
          <h3>{isEs ? 'Bajas y heridos estimados' : 'Estimated Casualties & Injuries'}</h3>
          <div className="casualty-grid">
            <div className="casualty-card">
              <span className="casualty-label">{isEs ? 'Población expuesta' : 'Exposed population'}</span>
              <strong className="casualty-number">{number(language, casualtyResult.totalExposed)}</strong>
            </div>
            <div className="casualty-card casualty-fatalities">
              <span className="casualty-label">{isEs ? 'Bajas mortales' : 'Fatalities'}</span>
              <strong className="casualty-number" style={{ color: '#ef4444' }}>
                {number(language, casualtyResult.fatalities)}
              </strong>
            </div>
            <div className="casualty-card casualty-injuries">
              <span className="casualty-label">{isEs ? 'Heridos estimados' : 'Injuries'}</span>
              <strong className="casualty-number" style={{ color: '#f97316' }}>
                {number(language, casualtyResult.injuries)}
              </strong>
            </div>
          </div>
          <p className="casualty-method-note">
            {isEs
              ? 'Estimación modelada con matriz de vulnerabilidad FEMA / Glasstone & Dolan y cuadrícula WorldPop (100 m).'
              : 'Estimate modeled using FEMA / Glasstone & Dolan vulnerability matrices and WorldPop (100 m) raster.'}
          </p>
        </section>
      )}

      {onLocate && (
        <div className="blast-action-wrap">
          <button type="button" className="primary" onClick={onLocate}>
            {targetPoint
              ? (isEs ? 'Centrar detonación en el mapa' : 'Center blast on map')
              : (entry.location ? t('viewReference') : (isEs ? 'Ver afectación en el mapa' : 'View blast on map'))}
          </button>
        </div>
      )}

      {entry.location && (
        <details className="reference-location-details">
          <summary>{t('referenceLocation')}</summary>
          <p>{entry.location.label}</p>
          <a href={entry.location.source.url} target="_blank" rel="noopener noreferrer">
            {entry.location.source.title} ↗
          </a>
        </details>
      )}

      <h2>{t('sources')}</h2>
      <ul className="sources-list">
        {entry.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title} ↗
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
