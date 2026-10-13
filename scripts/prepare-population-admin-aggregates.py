#!/usr/bin/env python3
"""Prepare versioned geoBoundaries population aggregates from official raster tiles."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import struct
import sys
import traceback
import zlib
from collections import OrderedDict
from pathlib import Path

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import Window, bounds as raster_window_bounds
from shapely.geometry import box, shape
from shapely.prepared import prep
from shapely.validation import explain_validity
from geojson_stream import iter_geojson_features
from population_geometry import normalize_wgs84_roundoff


SHARD_COUNT = 256
TILE_SIZE = 512
CELL_COUNT = TILE_SIZE * TILE_SIZE
DATA_BYTES = CELL_COUNT * 4
MASK_BYTES = CELL_COUNT // 8
EXPANDED_BYTES = DATA_BYTES + MASK_BYTES
INDEX_HEADER = struct.Struct("<8sIHHIIIIIQ32s")
INDEX_RECORD = struct.Struct("<QII")
INDEX_MAGIC = b"MTPOP001"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
    with temporary.open("w", encoding="utf-8", newline="\n") as output:
        output.write(encoded)
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, path)


def shard_for(feature_id: str) -> str:
    return hashlib.sha256(feature_id.encode("utf-8")).hexdigest()[:2]


def pixel_window(geometry, dataset: rasterio.io.DatasetReader):
    west, south, east, north = geometry.bounds
    transform = dataset.transform
    column_start = max(0, math.floor((west - transform.c) / transform.a))
    column_end = min(dataset.width, math.ceil((east - transform.c) / transform.a))
    row_start = max(0, math.floor((north - transform.f) / transform.e))
    row_end = min(dataset.height, math.ceil((south - transform.f) / transform.e))
    if column_start >= column_end or row_start >= row_end:
        return None
    return column_start, row_start, column_end, row_end


class PreparedBlockReader:
    def __init__(self, prepared: Path, manifest: dict) -> None:
        self.data_path = prepared / "data.bin"
        self.index_path = prepared / "index.bin"
        self.data_file = self.data_path.open("rb")
        self.data_bytes = self.data_path.stat().st_size
        self.cache: OrderedDict[tuple[int, int], tuple[np.ndarray, np.ndarray, int, float]] = OrderedDict()
        self.index_bytes = self.index_path.read_bytes()
        if sha256_file(self.data_path) != manifest["storage"]["data"]["sha256"]:
            raise ValueError("Prepared population block data checksum differs from its manifest")
        if hashlib.sha256(self.index_bytes).hexdigest() != manifest["storage"]["index"]["sha256"]:
            raise ValueError("Prepared population block index checksum differs from its manifest")
        if len(self.index_bytes) < INDEX_HEADER.size:
            raise ValueError("Prepared population block index is truncated")
        header = INDEX_HEADER.unpack_from(self.index_bytes)
        magic, version, tile_width, tile_height, self.columns, self.rows, self.width, self.height, record_bytes, data_bytes, source_sha = header
        if magic != INDEX_MAGIC or version != 1 or tile_width != TILE_SIZE or tile_height != TILE_SIZE or record_bytes != INDEX_RECORD.size:
            raise ValueError("Prepared population block index has an unsupported format")
        if source_sha.hex() != manifest["sourceSha256"] or data_bytes != self.data_bytes:
            raise ValueError("Prepared population block index points at different source data")
        if len(self.index_bytes) != INDEX_HEADER.size + self.rows * self.columns * INDEX_RECORD.size:
            raise ValueError("Prepared population block index has a missing or extra record")

    def tile(self, row: int, column: int) -> tuple[np.ndarray, np.ndarray, int, float] | None:
        key = (row, column)
        cached = self.cache.get(key)
        if cached is not None:
            self.cache.move_to_end(key)
            return cached
        if row < 0 or row >= self.rows or column < 0 or column >= self.columns:
            raise ValueError("Administrative aggregate requested a tile outside the prepared index")
        record_index = row * self.columns + column
        offset = INDEX_HEADER.size + record_index * INDEX_RECORD.size
        data_offset, compressed_bytes, checksum = INDEX_RECORD.unpack_from(self.index_bytes, offset)
        if compressed_bytes == 0:
            if data_offset != 0 or checksum != 0:
                raise ValueError("Empty prepared population block has non-zero index fields")
            return None
        if compressed_bytes > EXPANDED_BYTES or data_offset + compressed_bytes > self.data_bytes:
            raise ValueError("Prepared population block index points outside data.bin")
        self.data_file.seek(data_offset)
        compressed = self.data_file.read(compressed_bytes)
        if len(compressed) != compressed_bytes:
            raise ValueError("Prepared population block is truncated")
        raw = zlib.decompress(compressed)
        if len(raw) != EXPANDED_BYTES or zlib.crc32(raw) & 0xFFFFFFFF != checksum:
            raise ValueError("Prepared population block failed its length or CRC check")
        values = np.frombuffer(raw, dtype="<f4", count=CELL_COUNT).reshape((TILE_SIZE, TILE_SIZE))
        bits = np.frombuffer(raw, dtype=np.uint8, count=MASK_BYTES, offset=DATA_BYTES)
        valid = np.unpackbits(bits, bitorder="little").reshape((TILE_SIZE, TILE_SIZE))
        valid_boolean = valid > 0
        valid_cells = int(valid_boolean.sum())
        valid_values = values[valid_boolean]
        if valid_values.size and (not np.isfinite(valid_values).all() or (valid_values < 0).any()):
            raise ValueError("Prepared population block contains invalid values in valid cells")
        population = float(valid_values.sum(dtype=np.float64))
        result = (values, valid, valid_cells, population)
        self.cache[key] = result
        if len(self.cache) > 256:
            self.cache.popitem(last=False)
        return result

    def close(self) -> None:
        self.data_file.close()


def aggregate_feature(geometry, dataset: rasterio.io.DatasetReader, blocks: PreparedBlockReader, progress_label: str = "") -> dict:
    window_bounds = pixel_window(geometry, dataset)
    if window_bounds is None:
        return {"population": 0, "validGridCells": 0, "intersectedGridCells": 0, "noDataGridCells": 0}
    column_start, row_start, column_end, row_end = window_bounds
    intersected = valid = 0
    population = 0.0
    prepared_geometry = prep(geometry)
    total_tiles = (math.ceil(row_end / TILE_SIZE) - row_start // TILE_SIZE) * (math.ceil(column_end / TILE_SIZE) - column_start // TILE_SIZE)
    processed_tiles = 0
    for tile_row in range(row_start // TILE_SIZE, math.ceil(row_end / TILE_SIZE)):
        for tile_column in range(column_start // TILE_SIZE, math.ceil(column_end / TILE_SIZE)):
            processed_tiles += 1
            if progress_label and processed_tiles % 5000 == 0:
                print(f"{progress_label}: teselas {processed_tiles}/{total_tiles}", flush=True)
            tile_col = tile_column * TILE_SIZE
            tile_row_start = tile_row * TILE_SIZE
            tile_width = min(TILE_SIZE, dataset.width - tile_col)
            tile_height = min(TILE_SIZE, dataset.height - tile_row_start)
            tile_window = Window(tile_col, tile_row_start, tile_width, tile_height)
            tile_geometry = box(*raster_window_bounds(tile_window, dataset.transform))
            if not prepared_geometry.intersects(tile_geometry):
                continue
            if prepared_geometry.covers(tile_geometry):
                intersected += tile_width * tile_height
                tile = blocks.tile(tile_row, tile_column)
                if tile is not None:
                    valid += tile[2]
                    population += tile[3]
                continue

            col = max(column_start, tile_col)
            row = max(row_start, tile_row_start)
            right = min(column_end, tile_col + TILE_SIZE, dataset.width)
            bottom = min(row_end, tile_row_start + TILE_SIZE, dataset.height)
            width = right - col
            height = bottom - row
            window = Window(col, row, width, height)
            clipped_geometry = geometry.intersection(tile_geometry)
            if clipped_geometry.is_empty:
                continue
            if clipped_geometry.geom_type in ("Polygon", "MultiPolygon"):
                clipped_shapes = [clipped_geometry.__geo_interface__]
            elif clipped_geometry.geom_type == "GeometryCollection":
                clipped_shapes = [part.__geo_interface__ for part in clipped_geometry.geoms if part.geom_type in ("Polygon", "MultiPolygon")]
            else:
                continue
            if not clipped_shapes:
                continue
            inside = geometry_mask(
                clipped_shapes,
                out_shape=(height, width),
                transform=dataset.window_transform(window),
                all_touched=False,
                invert=True,
            )
            if not inside.any():
                continue
            tile = blocks.tile(tile_row, tile_column)
            if tile is None:
                intersected += int(inside.sum())
                continue
            tile_values, tile_valid = tile[:2]
            row_offset, column_offset = row - tile_row_start, col - tile_col
            values = tile_values[row_offset:row_offset + height, column_offset:column_offset + width]
            valid_tile = tile_valid[row_offset:row_offset + height, column_offset:column_offset + width]
            valid_mask = (valid_tile > 0) & inside
            selected = values[valid_mask]
            if selected.size and (not np.isfinite(selected).all() or (selected < 0).any()):
                raise ValueError("A source GeoTIFF contains invalid population values inside an administrative boundary")
            intersected += int(inside.sum())
            valid += int(selected.size)
            population += float(selected.sum(dtype=np.float64))
    return {"population": population, "validGridCells": valid, "intersectedGridCells": intersected, "noDataGridCells": intersected - valid}


def load_features(path: Path, layer: dict, expected_country: str):
    seen: set[str] = set()
    for feature in iter_geojson_features(path):
        if not isinstance(feature, dict) or feature.get("type") != "Feature" or not isinstance(feature.get("properties"), dict):
            raise ValueError(f"Boundary source contains an incompatible feature: {path.name}")
        props = feature["properties"]
        feature_id, country, level = props.get("shapeID"), props.get("shapeGroup"), props.get("shapeType")
        if not isinstance(feature_id, str) or not feature_id or country != expected_country or level != layer["level"]:
            raise ValueError(f"Boundary feature identity differs from its pinned layer: {path.name}")
        if feature_id in seen:
            raise ValueError(f"Boundary source repeats feature ID {feature_id}")
        geometry = shape(feature.get("geometry"))
        geometry, roundoff_degrees = normalize_wgs84_roundoff(geometry, feature_id)
        if roundoff_degrees:
            print(f"{expected_country} {layer['level']} {feature_id}: antimeridian roundoff clamped by {roundoff_degrees:.3g} degrees; source GeoJSON unchanged", flush=True)
        if geometry.geom_type not in ("Polygon", "MultiPolygon") or geometry.is_empty or not geometry.is_valid:
            raise ValueError(f"Invalid administrative geometry {feature_id}: {explain_validity(geometry)}")
        west, south, east, north = geometry.bounds
        if west < -180 or east > 180 or south < -90 or north > 90:
            raise ValueError(f"Administrative geometry {feature_id} is outside EPSG:4326")
        seen.add(feature_id)
        yield feature_id, geometry


def build(args: argparse.Namespace) -> dict:
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    runtime_catalog = json.loads(args.runtime_catalog.read_text(encoding="utf-8"))
    rasters = [item for item in catalog["population"]["datasets"] if item["countryCode"] == args.country]
    if len(rasters) != 1:
        raise ValueError(f"Country {args.country} does not have exactly one pinned raster")
    raster = rasters[0]
    raster_manifest_path = args.prepared / "manifest.json"
    manifest = json.loads(raster_manifest_path.read_text(encoding="utf-8"))
    source_path = args.source
    if sha256_file(source_path) != manifest.get("sourceSha256"):
        raise ValueError("Prepared raster source checksum differs from its official GeoTIFF")
    layers = [item for item in runtime_catalog["boundaries"]["adminLayers"] if item["countryCode"] == args.country]
    if not layers:
        manifest["administrativeAggregates"] = []
        manifest["administrativeCoverage"] = {"status": "unavailable", "reason": "no_pinned_geoboundaries_layer"}
        atomic_json(raster_manifest_path, manifest)
        return {"countryCode": args.country, "datasetId": raster["datasetId"], "layers": 0, "features": 0, "sourceSha256": manifest["sourceSha256"], "administrativeCoverage": "unavailable"}

    aggregate_root = args.prepared / "aggregates"
    final_entries = []
    blocks = PreparedBlockReader(args.prepared, manifest)
    try:
        with rasterio.open(source_path) as dataset:
            if dataset.crs is None or dataset.crs.to_epsg() != 4326 or dataset.count != 1 or dataset.dtypes != ("float32",):
                raise ValueError("Population aggregation requires the same EPSG:4326 Float32 source as the raster converter")
            if dataset.width != blocks.width or dataset.height != blocks.height:
                raise ValueError("Prepared population blocks do not match the official raster dimensions")
            for layer_index, layer in enumerate(layers, start=1):
                boundary_path = args.boundaries / f"{layer['boundaryId']}.geojson"
                if not boundary_path.is_file() or boundary_path.stat().st_size == 0:
                    raise ValueError(f"Missing pinned boundary GeoJSON: {boundary_path.name}")
                source_sha = sha256_file(boundary_path)
                shards: dict[str, dict] = {}
                feature_count = 0
                for feature_index, (feature_id, geometry) in enumerate(load_features(boundary_path, layer, args.country), start=1):
                    feature_count = feature_index
                    label = f"{args.country} {layer['level']} {feature_id}"
                    shards.setdefault(shard_for(feature_id), {})[feature_id] = aggregate_feature(geometry, dataset, blocks, label)
                    if feature_index % 250 == 0:
                        print(f"{args.country} {layer['level']}: agregados {feature_index}", flush=True)
                if feature_count == 0:
                    raise ValueError(f"Boundary source has no usable features: {boundary_path.name}")
                asset_shards = []
                prefix = f"population/releases/{raster['edition']}/{args.country}/{manifest['sourceSha256']}/aggregates/{layer['boundaryId']}"
                target_layer_dir = aggregate_root / layer["boundaryId"]
                target_layer_dir.mkdir(parents=True, exist_ok=True)
                for shard_id, records in sorted(shards.items()):
                    shard_path = target_layer_dir / f"{shard_id}.json"
                    shard_payload = {
                        "schemaVersion": 1,
                        "countryCode": args.country,
                        "datasetId": raster["datasetId"],
                        "boundaryLayerId": layer["boundaryId"],
                        "boundaryYear": layer["boundaryYear"],
                        "boundarySourceSha256": source_sha,
                        "sourceSha256": manifest["sourceSha256"],
                        "method": "cell_center_inside_polygon",
                        "shard": shard_id,
                        "records": records,
                    }
                    atomic_json(shard_path, shard_payload)
                    raw = shard_path.read_bytes()
                    asset_shards.append({"shard": shard_id, "key": f"{prefix}/{shard_id}.json", "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "features": len(records)})
                final_entries.append({
                    "boundaryLayerId": layer["boundaryId"],
                    "boundaryYear": layer["boundaryYear"],
                    "sourceUrl": layer["geoJsonUrl"],
                    "sourceSha256": source_sha,
                    "featureCount": feature_count,
                    "shards": asset_shards,
                })
                print(f"[{layer_index}/{len(layers)}] {args.country} {layer['level']}: {feature_count} límites, {len(asset_shards)} fragmentos", flush=True)
    finally:
        blocks.close()
    manifest["administrativeAggregates"] = final_entries
    manifest["administrativeCoverage"] = {"status": "available", "layers": len(final_entries), "features": sum(entry["featureCount"] for entry in final_entries)}
    atomic_json(raster_manifest_path, manifest)
    return {"countryCode": args.country, "datasetId": raster["datasetId"], "layers": len(final_entries), "features": sum(entry["featureCount"] for entry in final_entries), "sourceSha256": manifest["sourceSha256"]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--runtime-catalog", type=Path, required=True)
    parser.add_argument("--country", required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--prepared", type=Path, required=True)
    parser.add_argument("--boundaries", type=Path, required=True)
    args = parser.parse_args()
    try:
        if len(args.country) != 3 or not args.country.isascii() or args.country.upper() != args.country:
            raise ValueError("Country code must be an uppercase ISO alpha-3 value")
        print(json.dumps(build(args), ensure_ascii=False))
        return 0
    except Exception as error:
        print(f"Administrative aggregation failed: {error}", file=sys.stderr)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
