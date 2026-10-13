#!/usr/bin/env python3
"""Convert one pinned WorldPop GeoTIFF to bounded, checksummed R2 blocks."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import struct
import sys
import zlib
from pathlib import Path

import numpy as np
import rasterio


MAGIC = b"MTPOP001"
FORMAT_VERSION = 1
BLOCK_WIDTH = 512
BLOCK_HEIGHT = 512
CELL_COUNT = BLOCK_WIDTH * BLOCK_HEIGHT
DATA_BYTES = CELL_COUNT * 4
MASK_BYTES = CELL_COUNT // 8
EXPANDED_BYTES = DATA_BYTES + MASK_BYTES
RECORD = struct.Struct("<QII")
HEADER = struct.Struct("<8sIHHIIIIIQ32s")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_path(path: Path) -> str:
    return sha256_file(path)


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    os.replace(temporary, path)


def check_metadata(dataset: rasterio.io.DatasetReader, expected: dict) -> None:
    if dataset.count != 1 or dataset.dtypes != ("float32",):
        raise ValueError("Expected a single-band Float32 WorldPop raster")
    if dataset.crs is None or dataset.crs.to_epsg() != 4326:
        raise ValueError("Expected source CRS EPSG:4326")
    if dataset.width != int(expected["dimensions"]["width"]) or dataset.height != int(expected["dimensions"]["height"]):
        raise ValueError("GeoTIFF dimensions differ from the pinned STAC catalog")
    if dataset.nodata is None or float(dataset.nodata) != float(expected["noDataValue"]):
        raise ValueError("GeoTIFF NoData differs from the pinned STAC catalog")
    if not dataset.is_tiled or dataset.block_shapes != [(BLOCK_HEIGHT, BLOCK_WIDTH)]:
        raise ValueError("Source layout is not tiled in the verified 512x512 block format")
    if dataset.transform.b != 0 or dataset.transform.d != 0 or dataset.transform.a <= 0 or dataset.transform.e >= 0:
        raise ValueError("Source affine transform is unsupported")
    if not all(math.isfinite(value) for value in dataset.transform[:6]):
        raise ValueError("Source affine transform contains non-finite values")


def build(args: argparse.Namespace) -> dict:
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    matches = [record for record in catalog["population"]["datasets"] if record["countryCode"] == args.country]
    if len(matches) != 1:
        raise ValueError(f"Country {args.country} does not have exactly one pinned dataset")
    dataset_record = matches[0]
    if args.source.name != dataset_record["datasetId"] + ".tif":
        raise ValueError("Source filename does not match the pinned dataset ID")
    if not args.source.is_file() or args.source.stat().st_size < 1:
        raise ValueError("Source GeoTIFF is missing or empty")

    source_sha256 = sha256_file(args.source)
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = output / "manifest.json"
    data_path = output / "data.bin"
    index_path = output / "index.bin"
    if manifest_path.exists() and data_path.exists() and index_path.exists():
        prior = json.loads(manifest_path.read_text(encoding="utf-8"))
        if prior.get("sourceSha256") == source_sha256:
            if prior["storage"]["data"]["sha256"] == sha256_path(data_path) and prior["storage"]["index"]["sha256"] == sha256_path(index_path):
                return prior
            raise ValueError("Existing prepared output failed its checksum check; preserve it and use a new output directory")
        raise ValueError("Output directory belongs to a different source checksum; preserve it and use a new output directory")

    data_temp = output / "data.bin.tmp"
    index_temp = output / "index.bin.tmp"
    manifest_temp = output / "manifest.json.tmp"
    rows = math.ceil(int(dataset_record["dimensions"]["height"]) / BLOCK_HEIGHT)
    columns = math.ceil(int(dataset_record["dimensions"]["width"]) / BLOCK_WIDTH)
    data_digest = hashlib.sha256()
    source_valid_cells = 0
    nodata_cells = 0
    edge_padding_cells = 0
    population_total = 0.0
    stored_blocks = 0
    empty_blocks = 0
    data_offset = 0
    record_count = 0

    try:
        with rasterio.open(args.source) as dataset, data_temp.open("wb") as data_file, index_temp.open("w+b") as index_file:
            check_metadata(dataset, dataset_record)
            header = HEADER.pack(MAGIC, FORMAT_VERSION, BLOCK_WIDTH, BLOCK_HEIGHT, columns, rows, dataset.width, dataset.height, RECORD.size, 0, bytes.fromhex(source_sha256))
            raster_width, raster_height = dataset.width, dataset.height
            raster_transform, raster_nodata = list(dataset.transform[:6]), float(dataset.nodata)
            index_file.write(header)
            for _, window in dataset.block_windows(1):
                tile_x = int(window.col_off) // BLOCK_WIDTH
                tile_y = int(window.row_off) // BLOCK_HEIGHT
                height = int(window.height)
                width = int(window.width)
                values = np.full((BLOCK_HEIGHT, BLOCK_WIDTH), dataset.nodata, dtype=np.float32)
                mask = np.zeros((BLOCK_HEIGHT, BLOCK_WIDTH), dtype=np.bool_)
                source_values = dataset.read(1, window=window, masked=False)
                source_mask = dataset.read_masks(1, window=window) > 0
                tile_values = values[:height, :width]
                tile_mask = mask[:height, :width]
                tile_values[:] = source_values
                tile_mask[:] = source_mask
                if not np.isfinite(tile_values[tile_mask]).all() or (tile_values[tile_mask] < 0).any():
                    raise ValueError(f"Valid population cells contain invalid values in tile {tile_x},{tile_y}")
                valid_count = int(tile_mask.sum())
                source_valid_cells += valid_count
                nodata_cells += width * height - valid_count
                edge_padding_cells += CELL_COUNT - width * height
                if valid_count:
                    population_total += float(tile_values[tile_mask].sum(dtype=np.float64))
                    raw = values.astype("<f4", copy=False).tobytes(order="C") + np.packbits(mask.reshape(-1), bitorder="little").tobytes()
                    if len(raw) != EXPANDED_BYTES:
                        raise ValueError("Prepared block expanded to an unexpected size")
                    compressed = zlib.compress(raw, level=6)
                    crc = zlib.crc32(raw) & 0xFFFFFFFF
                    RECORD.pack_into(index_file_buffer := bytearray(RECORD.size), 0, data_offset, len(compressed), crc)
                    data_file.write(compressed)
                    data_digest.update(compressed)
                    index_file.write(index_file_buffer)
                    data_offset += len(compressed)
                    stored_blocks += 1
                else:
                    index_file.write(RECORD.pack(0, 0, 0))
                    empty_blocks += 1
                record_count += 1
            if record_count != rows * columns:
                raise ValueError("GeoTIFF returned an incomplete source block grid")
            if data_offset != data_file.tell():
                raise ValueError("Prepared block offsets do not match the output data file")
            index_file.seek(36)
            index_file.write(struct.pack("<Q", data_offset))
            data_file.flush()
            index_file.flush()
            os.fsync(data_file.fileno())
            os.fsync(index_file.fileno())

        data_sha256 = data_digest.hexdigest()
        index_sha256 = sha256_file(index_temp)
        manifest = {
            "schemaVersion": 1,
            "countryCode": args.country,
            "datasetId": dataset_record["datasetId"],
            "provider": "WorldPop Global 2",
            "edition": dataset_record["edition"],
            "year": dataset_record["year"],
            "resolution": dataset_record["resolution"],
            "units": "people_per_grid_cell",
            "license": "CC-BY-4.0",
            "doi": dataset_record["doi"],
            "sourceUrl": dataset_record["dataUrl"],
            "sourceBytes": args.source.stat().st_size,
            "sourceSha256": source_sha256,
            "crs": "EPSG:4326",
            "transform": raster_transform,
            "width": raster_width,
            "height": raster_height,
            "dataType": "Float32",
            "byteOrder": "little-endian",
            "noDataValue": float(dataset.nodata),
            "mask": "explicit-validity-bitset-lsb-first",
            "compression": "zlib-deflate",
            "block": {
                "width": BLOCK_WIDTH,
                "height": BLOCK_HEIGHT,
                "rows": rows,
                "columns": columns,
                "recordBytes": RECORD.size,
                "indexHeaderBytes": HEADER.size,
                "expandedBytesMaximum": EXPANDED_BYTES,
                "indexLayout": "MTPOP001; row-major; uint64-le offset, uint32-le compressed length, uint32-le CRC-32",
            },
            "statistics": {
                "validCells": source_valid_cells,
                "nodataCells": nodata_cells,
                "edgePaddingCells": edge_padding_cells,
                "populationSum": population_total,
                "storedBlocks": stored_blocks,
                "emptyBlocks": empty_blocks,
            },
            "storage": {
                "data": {
                    "key": f"population/releases/{dataset_record['edition']}/{args.country}/{source_sha256}/data.bin",
                    "bytes": data_offset,
                    "sha256": data_sha256,
                },
                "index": {
                    "key": f"population/releases/{dataset_record['edition']}/{args.country}/{source_sha256}/index.bin",
                    "bytes": index_temp.stat().st_size,
                    "sha256": index_sha256,
                },
            },
        }
        atomic_json(manifest_temp, manifest)
        os.replace(data_temp, data_path)
        os.replace(index_temp, index_path)
        os.replace(manifest_temp, manifest_path)
        return manifest
    except Exception:
        for temporary in (data_temp, index_temp, manifest_temp):
            try:
                temporary.unlink()
            except FileNotFoundError:
                pass
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--country", required=True, help="Three-letter ISO code present in the pinned catalog")
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if len(args.country) != 3 or not args.country.isascii() or not args.country.isalpha() or args.country.upper() != args.country:
            raise ValueError("Country code must be an uppercase ISO alpha-3 value")
        result = build(args)
        print(json.dumps({key: result[key] for key in ("countryCode", "datasetId", "sourceSha256", "storage", "statistics")}, ensure_ascii=False))
        return 0
    except Exception as error:
        print(f"Population preparation failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
