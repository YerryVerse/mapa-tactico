import type {Map} from 'maplibre-gl';
import type {ContextEntry} from './scenario-contract';
import {calculateBlastRadii, createGeodesicCircle} from './blast-physics';

export const BLAST_LAYERS = [
  'blast-thermal-fill',
  'blast-thermal-line',
  'blast-1psi-fill',
  'blast-1psi-line',
  'blast-5psi-fill',
  'blast-5psi-line',
  'blast-20psi-fill',
  'blast-20psi-line',
] as const;

export const BLAST_SOURCES = [
  'blast-thermal-source',
  'blast-1psi-source',
  'blast-5psi-source',
  'blast-20psi-source',
] as const;

export const TARGET_LAYERS = [
  'target-marker-outer',
  'target-marker-inner',
] as const;

export const TARGET_SOURCES = ['target-marker-source'] as const;

export function mountTargetMarker(
  map: Map,
  targetPoint?: { lng: number; lat: number } | null
) {
  const remove = () => {
    try {
      for (const id of TARGET_LAYERS) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of TARGET_SOURCES) {
        if (map.getSource(id)) map.removeSource(id);
      }
    } catch {}
  };

  if (!targetPoint) {
    remove();
    return () => remove();
  }

  const add = () => {
    remove();
    map.addSource('target-marker-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [targetPoint.lng, targetPoint.lat],
        },
      },
    });

    map.addLayer({
      id: 'target-marker-outer',
      type: 'circle',
      source: 'target-marker-source',
      paint: {
        'circle-radius': 14,
        'circle-color': 'rgba(239, 68, 68, 0.25)',
        'circle-stroke-color': '#ef4444',
        'circle-stroke-width': 2,
      },
    });

    map.addLayer({
      id: 'target-marker-inner',
      type: 'circle',
      source: 'target-marker-source',
      paint: {
        'circle-radius': 4,
        'circle-color': '#ffffff',
        'circle-stroke-color': '#ef4444',
        'circle-stroke-width': 2,
      },
    });
  };

  if (map.getStyle()) add();
  else map.once('styledata', add);

  return () => {
    map.off('styledata', add);
    remove();
  };
}

export function mountBlastLayer(
  map: Map,
  entry: ContextEntry,
  targetPoint?: { lng: number; lat: number } | null
) {
  const center = targetPoint || (entry.location ? { lng: entry.location.lng, lat: entry.location.lat } : null);
  const yieldTonnes = entry.yieldTonnesTNT;

  const remove = () => {
    try {
      for (const id of BLAST_LAYERS) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of BLAST_SOURCES) {
        if (map.getSource(id)) map.removeSource(id);
      }
    } catch {
      /* Map may already be unmounted */
    }
  };

  if (!center || !yieldTonnes || yieldTonnes <= 0) {
    remove();
    return () => remove();
  }

  const radii = calculateBlastRadii(yieldTonnes);

  const add = () => {
    try {
      if (!map.getStyle()) return;
      remove();

      // 1. Thermal Radiation (Nuclear / High energy)
      if (radii.thermalRadiusKm > 0) {
        const thermalPoly = createGeodesicCircle(center.lng, center.lat, radii.thermalRadiusKm);
        map.addSource('blast-thermal-source', { type: 'geojson', data: thermalPoly });
        map.addLayer({
          id: 'blast-thermal-fill',
          type: 'fill',
          source: 'blast-thermal-source',
          paint: { 'fill-color': '#a855f7', 'fill-opacity': 0.15 },
        });
        map.addLayer({
          id: 'blast-thermal-line',
          type: 'line',
          source: 'blast-thermal-source',
          paint: { 'line-color': '#9333ea', 'line-width': 2.5, 'line-dasharray': [4, 2], 'line-opacity': 0.95 },
        });
      }

      // 2. 1 psi (Light damage / glass breakage)
      if (radii.radius1psiKm > 0) {
        const poly1 = createGeodesicCircle(center.lng, center.lat, radii.radius1psiKm);
        map.addSource('blast-1psi-source', { type: 'geojson', data: poly1 });
        map.addLayer({
          id: 'blast-1psi-fill',
          type: 'fill',
          source: 'blast-1psi-source',
          paint: { 'fill-color': '#eab308', 'fill-opacity': 0.22 },
        });
        map.addLayer({
          id: 'blast-1psi-line',
          type: 'line',
          source: 'blast-1psi-source',
          paint: { 'line-color': '#ca8a04', 'line-width': 2.5, 'line-opacity': 0.95 },
        });
      }

      // 3. 5 psi (Moderate destruction / residential collapse)
      if (radii.radius5psiKm > 0) {
        const poly5 = createGeodesicCircle(center.lng, center.lat, radii.radius5psiKm);
        map.addSource('blast-5psi-source', { type: 'geojson', data: poly5 });
        map.addLayer({
          id: 'blast-5psi-fill',
          type: 'fill',
          source: 'blast-5psi-source',
          paint: { 'fill-color': '#f97316', 'fill-opacity': 0.30 },
        });
        map.addLayer({
          id: 'blast-5psi-line',
          type: 'line',
          source: 'blast-5psi-source',
          paint: { 'line-color': '#ea580c', 'line-width': 3, 'line-opacity': 0.98 },
        });
      }

      // 4. 20 psi (Severe destruction / total demolition)
      if (radii.radius20psiKm > 0) {
        const poly20 = createGeodesicCircle(center.lng, center.lat, radii.radius20psiKm);
        map.addSource('blast-20psi-source', { type: 'geojson', data: poly20 });
        map.addLayer({
          id: 'blast-20psi-fill',
          type: 'fill',
          source: 'blast-20psi-source',
          paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.42 },
        });
        map.addLayer({
          id: 'blast-20psi-line',
          type: 'line',
          source: 'blast-20psi-source',
          paint: { 'line-color': '#b91c1c', 'line-width': 3.5, 'line-opacity': 1 },
        });
      }
    } catch (err) {
      console.error('Error mounting blast layers:', err);
    }
  };

  if (map.getStyle()) add();
  else map.once('styledata', add);

  return () => {
    map.off('styledata', add);
    remove();
  };
}
