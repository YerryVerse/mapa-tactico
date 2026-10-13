"""Small, explicit corrections for floating-point WGS84 boundary roundoff."""

from __future__ import annotations

import math

import numpy as np
from shapely.ops import transform as transform_geometry


WGS84_ROUNDOFF_TOLERANCE_DEGREES = 1e-9


def normalize_wgs84_roundoff(geometry, feature_id: str):
    """Clamp only sub-nanodegree overshoots at legal WGS84 coordinate bounds.

    Some pinned geoBoundaries coordinates encode the antimeridian as
    180.0000000000001. This is floating-point noise, not a longitude-wrap
    instruction. Larger excursions are rejected so real CRS errors stay visible.
    """
    west, south, east, north = geometry.bounds
    if not all(math.isfinite(value) for value in (west, south, east, north)):
        raise ValueError(f"Administrative geometry {feature_id} has non-finite coordinates")

    excess = max(0.0, -180.0 - west, east - 180.0, -90.0 - south, north - 90.0)
    if excess == 0:
        return geometry, 0.0
    if excess > WGS84_ROUNDOFF_TOLERANCE_DEGREES:
        raise ValueError(f"Administrative geometry {feature_id} is outside EPSG:4326")

    def clamp_coordinates(longitude, latitude, altitude=None):
        longitude = np.clip(longitude, -180.0, 180.0)
        latitude = np.clip(latitude, -90.0, 90.0)
        if altitude is None:
            return longitude, latitude
        return longitude, latitude, altitude

    normalized = transform_geometry(clamp_coordinates, geometry)
    if normalized.geom_type != geometry.geom_type or normalized.is_empty or not normalized.is_valid:
        raise ValueError(f"WGS84 roundoff normalization invalidated administrative geometry {feature_id}")
    west, south, east, north = normalized.bounds
    if west < -180 or east > 180 or south < -90 or north > 90:
        raise ValueError(f"Administrative geometry {feature_id} remains outside EPSG:4326 after roundoff normalization")
    return normalized, excess
