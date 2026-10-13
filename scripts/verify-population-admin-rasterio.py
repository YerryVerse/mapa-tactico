#!/usr/bin/env python3
"""Independently sum one administrative polygon from the official GeoTIFF."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import Window, bounds as raster_window_bounds
from shapely.geometry import box, shape
from shapely.strtree import STRtree


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--country", required=True)
    parser.add_argument("--boundary-layer-id", required=True)
    parser.add_argument("--feature-id", required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--boundary", type=Path, required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"[A-Z]{3}", args.country):
        raise ValueError("Country code must be uppercase ISO alpha-3")
    expected_level = re.fullmatch(rf"{args.country}-ADM([012])-[A-Za-z0-9-]+", args.boundary_layer_id)
    if not expected_level:
        raise ValueError("Boundary layer ID does not match the selected country")
    level = f"ADM{expected_level.group(1)}"
    payload = json.loads(args.boundary.read_text(encoding="utf-8"))
    if payload.get("type") != "FeatureCollection" or not isinstance(payload.get("features"), list):
        raise ValueError("Boundary source is not a GeoJSON FeatureCollection")
    matches = [feature for feature in payload["features"] if isinstance(feature, dict) and isinstance(feature.get("properties"), dict) and feature["properties"].get("shapeID") == args.feature_id]
    if len(matches) != 1:
        raise ValueError("Boundary source must contain exactly one matching shapeID")
    feature = matches[0]
    props = feature["properties"]
    if props.get("shapeGroup") != args.country or props.get("shapeType") != level:
        raise ValueError("Boundary feature identity differs from its pinned layer")
    geometry = shape(feature.get("geometry"))
    if geometry.geom_type not in ("Polygon", "MultiPolygon") or geometry.is_empty or not geometry.is_valid:
        raise ValueError("Boundary geometry must be a valid nonempty polygon")
    del payload, matches, feature, props

    components = list(geometry.geoms) if geometry.geom_type == "MultiPolygon" else [geometry]
    component_index = STRtree(components)
    west, south, east, north = geometry.bounds
    intersected = valid = 0
    population = 0.0
    with rasterio.Env(GDAL_CACHEMAX=256 * 1024 * 1024), rasterio.open(args.source) as dataset:
        if dataset.crs is None or dataset.crs.to_epsg() != 4326 or dataset.count != 1 or dataset.dtypes != ("float32",):
            raise ValueError("Reference sum requires a single-band Float32 EPSG:4326 raster")
        no_data = dataset.nodata
        if no_data is None or not math.isfinite(float(no_data)):
            raise ValueError("Reference raster must declare a finite NoData value")
        transform = dataset.transform
        column_start = max(0, math.floor((west - transform.c) / transform.a))
        column_end = min(dataset.width, math.ceil((east - transform.c) / transform.a))
        row_start = max(0, math.floor((north - transform.f) / transform.e))
        row_end = min(dataset.height, math.ceil((south - transform.f) / transform.e))
        first_column = (column_start // 512) * 512
        first_row = (row_start // 512) * 512
        tile_columns = math.ceil((column_end - first_column) / 512)
        tile_rows = math.ceil((row_end - first_row) / 512)
        total_tiles = tile_columns * tile_rows
        processed_tiles = 0
        for row in range(first_row, row_end, 512):
            height = min(512, dataset.height - row)
            for column in range(first_column, column_end, 512):
                width = min(512, dataset.width - column)
                window = Window(column, row, width, height)
                tile_geometry = box(*raster_window_bounds(window, transform))
                component_ids = component_index.query(tile_geometry, predicate="intersects")
                processed_tiles += 1
                if processed_tiles % 500 == 0:
                    print(f"Rasterio reference: {processed_tiles}/{total_tiles} tiles", file=sys.stderr, flush=True)
                if component_ids.size == 0:
                    continue
                candidates = [components[int(index)] for index in component_ids]
                covering = next((component for component in candidates if component.covers(tile_geometry)), None)
                if covering is not None:
                    inside = None
                    selected_cells = width * height
                else:
                    clipped_shapes = []
                    for component in candidates:
                        clipped = component.intersection(tile_geometry)
                        if clipped.is_empty:
                            continue
                        if clipped.geom_type == "Polygon":
                            clipped_shapes.append(clipped.__geo_interface__)
                        elif clipped.geom_type == "MultiPolygon":
                            clipped_shapes.extend(part.__geo_interface__ for part in clipped.geoms)
                        elif clipped.geom_type == "GeometryCollection":
                            for part in clipped.geoms:
                                if part.geom_type == "Polygon":
                                    clipped_shapes.append(part.__geo_interface__)
                                elif part.geom_type == "MultiPolygon":
                                    clipped_shapes.extend(nested.__geo_interface__ for nested in part.geoms)
                    if not clipped_shapes:
                        continue
                    inside = geometry_mask(
                        clipped_shapes,
                        out_shape=(height, width),
                        transform=dataset.window_transform(window),
                        all_touched=False,
                        invert=True,
                    )
                    selected_cells = int(inside.sum())
                    if selected_cells == 0:
                        continue
                values = dataset.read(1, window=window, masked=False)
                selected = values.reshape(-1) if inside is None else values[inside]
                valid_mask = np.isfinite(selected) & (selected != no_data) & (selected >= 0)
                selected_valid = selected[valid_mask]
                if selected_valid.size and not np.isfinite(selected_valid).all():
                    raise ValueError("Reference raster contains non-finite valid population")
                intersected += selected_cells
                valid += int(selected_valid.size)
                population += float(selected_valid.sum(dtype=np.float64))

    print(json.dumps({
        "countryCode": args.country,
        "boundaryLayerId": args.boundary_layer_id,
        "featureId": args.feature_id,
        "method": "cell_center_inside_polygon",
        "population": population,
        "validGridCells": valid,
        "intersectedGridCells": intersected,
        "noDataGridCells": intersected - valid,
        "reference": "official GeoTIFF + Rasterio, independently scanned in 512x512 windows",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
