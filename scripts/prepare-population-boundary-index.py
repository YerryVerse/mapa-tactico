#!/usr/bin/env python3
"""Prepare bounded, versioned search and display assets for oversized geoBoundaries layers."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import shapely
from shapely.geometry import mapping, shape
from geojson_stream import iter_geojson_features
from population_geometry import normalize_wgs84_roundoff

SOURCE_LAYER_MAX_BYTES = 12_000_000
INDEX_MAX_BYTES = 10_000_000
DISPLAY_MAX_BYTES = 2_000_000
DISPLAY_MAX_VERTICES = 250_000
TOLERANCES = (0.000025, 0.00005, 0.0001, 0.0002, 0.0004, 0.0008, 0.0016, 0.0032, 0.0064, 0.0128, 0.0256, 0.0512, 0.1024)
EARTH_RADIUS_METERS = 6_371_008.8


def sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_bytes(path: Path, raw: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("wb") as output:
        output.write(raw)
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, path)


def atomic_json(path: Path, payload: dict) -> bytes:
    raw = (json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    atomic_bytes(path, raw)
    return raw


def vertex_count(geometry) -> int:
    if geometry.geom_type == "Polygon":
        polygons = [geometry]
    elif geometry.geom_type == "MultiPolygon":
        polygons = list(geometry.geoms)
    else:
        raise ValueError("Administrative boundary must be Polygon or MultiPolygon")
    return sum(len(ring.coords) for polygon in polygons for ring in (polygon.exterior, *polygon.interiors))


def ring_area(coordinates) -> float:
    count = len(coordinates) - 1
    if count <= 2:
        return 0.0
    total = 0.0
    for index in range(count):
        lower = coordinates[index]
        middle = coordinates[index + 1 if index + 1 < count else 0]
        upper = coordinates[(index + 2) % count]
        lower_x = math.radians(lower[0])
        middle_y = math.radians(middle[1])
        upper_x = math.radians(upper[0])
        total += (upper_x - lower_x) * math.sin(middle_y)
    return total * (EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 2)


def turf_area_square_meters(geometry: dict) -> float:
    if geometry.get("type") == "Polygon":
        polygons = [geometry["coordinates"]]
    elif geometry.get("type") == "MultiPolygon":
        polygons = geometry["coordinates"]
    else:
        raise ValueError("Administrative boundary must be Polygon or MultiPolygon")
    total = 0.0
    for polygon in polygons:
        if not polygon:
            continue
        total += abs(ring_area(polygon[0]))
        for hole in polygon[1:]:
            total -= abs(ring_area(hole))
    if not math.isfinite(total) or total <= 0:
        raise ValueError("Administrative boundary has an invalid geodesic area")
    return total


def display_geometry(original):
    original_vertices = vertex_count(original)
    if original_vertices <= DISPLAY_MAX_VERTICES:
        original_geojson = mapping(original)
        original_raw = json.dumps(original_geojson, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
        if len(original_raw) <= DISPLAY_MAX_BYTES:
            return original_geojson, False, original_vertices, 0.0
    start_tolerance = (
        0.0016 if original_vertices >= 1_000_000 else
        0.0008 if original_vertices >= 500_000 else
        0.0004 if original_vertices >= 250_000 else
        TOLERANCES[0]
    )
    tolerance_candidates = (tolerance for tolerance in TOLERANCES if tolerance >= start_tolerance)
    for tolerance in tolerance_candidates:
        # These coordinates are only for map presentation. Keep topology checks,
        # while using the linear-time simplifier on large source geometries.
        candidate = original.simplify(tolerance, preserve_topology=False)
        if candidate.is_empty or candidate.geom_type != original.geom_type:
            continue
        candidate_vertices = vertex_count(candidate)
        if candidate_vertices > DISPLAY_MAX_VERTICES or not candidate.is_valid:
            continue
        candidate_geojson = mapping(candidate)
        encoded = json.dumps(candidate_geojson, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
        if len(encoded) <= DISPLAY_MAX_BYTES:
            return candidate_geojson, True, candidate_vertices, tolerance
    raise ValueError("Could not create a bounded administrative display geometry")


def build(args: argparse.Namespace) -> dict:
    runtime = json.loads(args.runtime_catalog.read_text(encoding="utf-8"))
    manifest_path = args.prepared / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("countryCode") != args.country or not isinstance(manifest.get("sourceSha256"), str):
        raise ValueError("Prepared raster manifest does not match the requested country")
    country_layers = [layer for layer in runtime["boundaries"]["adminLayers"] if layer["countryCode"] == args.country]
    aggregate_by_layer = {entry["boundaryLayerId"]: entry for entry in manifest.get("administrativeAggregates", [])}
    prepared = []
    manifest_changed = False
    for layer in country_layers:
        boundary_path = args.boundaries / f"{layer['boundaryId']}.geojson"
        if not boundary_path.is_file():
            raise ValueError(f"Missing pinned boundary GeoJSON: {boundary_path.name}")
        source_bytes = boundary_path.stat().st_size
        aggregate = aggregate_by_layer.get(layer["boundaryId"])
        if not aggregate or not isinstance(aggregate.get("shards"), list):
            raise ValueError(f"Administrative aggregates are not ready for {layer['boundaryId']}")
        if aggregate.get("boundarySourceBytes") != source_bytes:
            aggregate["boundarySourceBytes"] = source_bytes
            manifest_changed = True
        if source_bytes <= SOURCE_LAYER_MAX_BYTES:
            continue
        source_sha = sha256_file(boundary_path)
        if aggregate.get("sourceSha256") != source_sha:
            raise ValueError(f"Pinned boundary checksum differs for {layer['boundaryId']}")
        geometry_path = args.prepared / "boundaries" / layer["boundaryId"] / "display.ndjson"
        index_path = args.prepared / "boundaries" / layer["boundaryId"] / "index.json"
        geometry_path.parent.mkdir(parents=True, exist_ok=True)
        geometry_temporary = geometry_path.with_suffix(geometry_path.suffix + ".tmp")
        features_index = []
        count = 0
        with geometry_temporary.open("wb") as geometry_file:
            for feature in iter_geojson_features(boundary_path):
                properties = feature.get("properties") if isinstance(feature, dict) else None
                source_geometry = feature.get("geometry") if isinstance(feature, dict) else None
                if not isinstance(properties, dict) or not isinstance(source_geometry, dict):
                    raise ValueError(f"Boundary feature is malformed in {boundary_path.name}")
                feature_id = properties.get("shapeID")
                name = properties.get("shapeName")
                if not isinstance(feature_id, str) or not feature_id or not isinstance(name, str) or not name.strip():
                    raise ValueError(f"Boundary feature identity is incomplete in {boundary_path.name}")
                if properties.get("shapeGroup") != args.country or properties.get("shapeType") != layer["level"]:
                    raise ValueError(f"Boundary feature identity differs from the pinned layer: {boundary_path.name}")
                source_shape = shape(source_geometry)
                source_shape, roundoff_degrees = normalize_wgs84_roundoff(source_shape, feature_id)
                if roundoff_degrees:
                    print(f"{args.country} {layer['level']} {feature_id}: antimeridian roundoff clamped by {roundoff_degrees:.3g} degrees; source GeoJSON unchanged", flush=True)
                if source_shape.geom_type not in ("Polygon", "MultiPolygon") or source_shape.is_empty or not source_shape.is_valid:
                    raise ValueError(f"Invalid administrative geometry {feature_id} in {boundary_path.name}")
                normalized_source_geometry = mapping(source_shape)
                display_geojson, simplified, display_vertices, tolerance = display_geometry(source_shape)
                geometry_record = {"featureId": feature_id, "geometry": display_geojson}
                geometry_raw = (json.dumps(geometry_record, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
                offset = geometry_file.tell()
                geometry_file.write(geometry_raw)
                alternate = properties.get("shapeNameAlt")
                aliases = alternate if isinstance(alternate, list) else [alternate] if isinstance(alternate, str) else []
                aliases = [alias.strip() for alias in aliases if isinstance(alias, str) and alias.strip()][:10]
                area_km2 = turf_area_square_meters(normalized_source_geometry) / 1_000_000
                features_index.append({
                    "featureId": feature_id,
                    "name": name.strip(),
                    "aliases": aliases,
                    "geometryType": source_geometry["type"],
                    "areaKm2": area_km2,
                    "geometryOffset": offset,
                    "geometryBytes": len(geometry_raw),
                    "geometrySha256": sha256_bytes(geometry_raw),
                    "geometrySimplified": simplified,
                    "sourceVertices": vertex_count(source_shape),
                    "displayVertices": display_vertices,
                    "displayToleranceDegrees": tolerance,
                })
                count += 1
                if count % 25 == 0 or (source_bytes >= 100_000_000 and count <= 10):
                    print(f"{args.country} {layer['level']}: límites indexados {count}", flush=True)
            geometry_file.flush()
            os.fsync(geometry_file.fileno())
            geometry_bytes = geometry_file.tell()
        if count != int(aggregate.get("featureCount", -1)):
            geometry_temporary.unlink(missing_ok=True)
            raise ValueError(f"Boundary index feature count differs from aggregates for {layer['boundaryId']}")
        os.replace(geometry_temporary, geometry_path)
        index_payload = {
            "schemaVersion": 1,
            "countryCode": args.country,
            "boundaryLayerId": layer["boundaryId"],
            "boundaryYear": layer["boundaryYear"],
            "boundarySourceSha256": source_sha,
            "sourceBytes": source_bytes,
            "featureCount": count,
            "features": features_index,
        }
        index_raw = atomic_json(index_path, index_payload)
        if len(index_raw) > INDEX_MAX_BYTES:
            raise ValueError(f"Boundary search index exceeds {INDEX_MAX_BYTES} bytes: {layer['boundaryId']}")
        prefix = f"population/releases/{manifest['edition']}/{args.country}/{manifest['sourceSha256']}/boundary-data/{layer['boundaryId']}"
        aggregate["boundaryData"] = {
            "sourceBytes": source_bytes,
            "sourceSha256": source_sha,
            "featureCount": count,
            "index": {"key": f"{prefix}/index.json", "bytes": len(index_raw), "sha256": sha256_bytes(index_raw)},
            "display": {"key": f"{prefix}/display.ndjson", "bytes": geometry_bytes, "sha256": sha256_file(geometry_path)},
        }
        manifest_changed = True
        prepared.append({"boundaryLayerId": layer["boundaryId"], "features": count, "sourceBytes": source_bytes, "indexBytes": len(index_raw), "displayBytes": geometry_bytes})
        print(f"{args.country} {layer['level']}: índice R2 de {count} límites; fuente {source_bytes} bytes, geometría de presentación {geometry_bytes} bytes", flush=True)
    if manifest_changed:
        atomic_json(manifest_path, manifest)
    return {"countryCode": args.country, "preparedBoundaryIndexes": prepared}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-catalog", type=Path, required=True)
    parser.add_argument("--country", required=True)
    parser.add_argument("--prepared", type=Path, required=True)
    parser.add_argument("--boundaries", type=Path, required=True)
    args = parser.parse_args()
    result = build(args)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
