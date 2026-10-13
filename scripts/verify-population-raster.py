#!/usr/bin/env python3
"""Independently verify every prepared block against its official GeoTIFF."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import zlib
from pathlib import Path

import numpy as np
import rasterio


MAGIC = b"MTPOP001"
HEADER = struct.Struct("<8sIHHIIIIIQ32s")
RECORD = struct.Struct("<QII")
BLOCK_WIDTH = 512
BLOCK_HEIGHT = 512
CELL_COUNT = BLOCK_WIDTH * BLOCK_HEIGHT
DATA_BYTES = CELL_COUNT * 4
MASK_BYTES = CELL_COUNT // 8
EXPANDED_BYTES = DATA_BYTES + MASK_BYTES


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        while chunk := file.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def verify(source: Path, prepared: Path) -> dict:
    manifest = json.loads((prepared / "manifest.json").read_text(encoding="utf-8"))
    data_path, index_path = prepared / "data.bin", prepared / "index.bin"
    if sha256_file(source) != manifest["sourceSha256"]:
        raise ValueError("Official source checksum does not match the prepared manifest")
    if sha256_file(data_path) != manifest["storage"]["data"]["sha256"] or sha256_file(index_path) != manifest["storage"]["index"]["sha256"]:
        raise ValueError("Prepared object checksum does not match the manifest")
    index_bytes = index_path.read_bytes()
    header = HEADER.unpack(index_bytes[: HEADER.size])
    magic, version, tile_width, tile_height, columns, rows, width, height, record_bytes, data_bytes, source_sha = header
    if magic != MAGIC or version != 1 or tile_width != BLOCK_WIDTH or tile_height != BLOCK_HEIGHT or record_bytes != RECORD.size:
        raise ValueError("Prepared block index header is incompatible")
    if source_sha.hex() != manifest["sourceSha256"] or data_bytes != data_path.stat().st_size or data_bytes != manifest["storage"]["data"]["bytes"]:
        raise ValueError("Prepared block index points at different source or data bytes")
    if len(index_bytes) != HEADER.size + rows * columns * RECORD.size:
        raise ValueError("Prepared block index contains a missing or extra record")

    population_total = 0.0
    valid_cells = 0
    nodata_cells = 0
    edge_padding_cells = 0
    stored_blocks = 0
    empty_blocks = 0
    last_data_end = 0
    record_offset = HEADER.size
    with rasterio.open(source) as dataset, data_path.open("rb") as data_file:
        if dataset.width != width or dataset.height != height or dataset.count != 1 or dataset.dtypes != ("float32",):
            raise ValueError("Prepared raster dimensions or type do not match its source")
        if math.ceil(width / BLOCK_WIDTH) != columns or math.ceil(height / BLOCK_HEIGHT) != rows:
            raise ValueError("Prepared tile grid does not cover the source dimensions")
        for tile_index, (_, window) in enumerate(dataset.block_windows(1)):
            offset, compressed_bytes, checksum = RECORD.unpack_from(index_bytes, record_offset)
            record_offset += RECORD.size
            height_in_tile, width_in_tile = int(window.height), int(window.width)
            expected_values = np.full((BLOCK_HEIGHT, BLOCK_WIDTH), dataset.nodata, dtype=np.float32)
            expected_mask = np.zeros((BLOCK_HEIGHT, BLOCK_WIDTH), dtype=np.bool_)
            source_values = dataset.read(1, window=window, masked=False)
            source_mask = dataset.read_masks(1, window=window) > 0
            expected_values[:height_in_tile, :width_in_tile] = source_values
            expected_mask[:height_in_tile, :width_in_tile] = source_mask
            valid_count = int(source_mask.sum())
            valid_cells += valid_count
            nodata_cells += height_in_tile * width_in_tile - valid_count
            edge_padding_cells += CELL_COUNT - height_in_tile * width_in_tile
            if valid_count == 0:
                if offset != 0 or compressed_bytes != 0 or checksum != 0:
                    raise ValueError(f"Empty tile {tile_index} unexpectedly contains bytes")
                empty_blocks += 1
                continue
            if offset != last_data_end or compressed_bytes < 1 or offset + compressed_bytes > data_bytes:
                raise ValueError(f"Tile {tile_index} has an invalid or overlapping data range")
            data_file.seek(offset)
            compressed = data_file.read(compressed_bytes)
            expanded = zlib.decompress(compressed)
            if len(expanded) != EXPANDED_BYTES:
                raise ValueError(f"Tile {tile_index} exceeds or misses its fixed expanded size")
            if zlib.crc32(expanded) & 0xFFFFFFFF != checksum:
                raise ValueError(f"Tile {tile_index} fails its CRC-32")
            actual_values = np.frombuffer(expanded[:DATA_BYTES], dtype="<f4").reshape((BLOCK_HEIGHT, BLOCK_WIDTH))
            actual_mask = np.unpackbits(np.frombuffer(expanded[DATA_BYTES:], dtype=np.uint8), bitorder="little").astype(bool).reshape((BLOCK_HEIGHT, BLOCK_WIDTH))
            if not np.array_equal(actual_values.view(np.uint32), expected_values.view(np.uint32)):
                raise ValueError(f"Tile {tile_index} changes one or more Float32 source values")
            if not np.array_equal(actual_mask, expected_mask):
                raise ValueError(f"Tile {tile_index} changes one or more NoData mask bits")
            population_total += float(source_values[source_mask].sum(dtype=np.float64))
            last_data_end = offset + compressed_bytes
            stored_blocks += 1
    statistics = manifest["statistics"]
    if last_data_end != data_bytes:
        raise ValueError("Prepared data object has unindexed trailing bytes")
    if (valid_cells, nodata_cells, edge_padding_cells, stored_blocks, empty_blocks) != (
        statistics["validCells"], statistics["nodataCells"], statistics["edgePaddingCells"], statistics["storedBlocks"], statistics["emptyBlocks"]
    ):
        raise ValueError("Prepared manifest cell or block counts do not match the independent verification")
    if not math.isclose(population_total, statistics["populationSum"], rel_tol=1e-12, abs_tol=1e-6):
        raise ValueError("Prepared manifest population sum does not match the independent verification")
    return {
        "countryCode": manifest["countryCode"],
        "datasetId": manifest["datasetId"],
        "sourceSha256": manifest["sourceSha256"],
        "dataSha256": manifest["storage"]["data"]["sha256"],
        "indexSha256": manifest["storage"]["index"]["sha256"],
        "validCells": valid_cells,
        "nodataCells": nodata_cells,
        "populationSum": population_total,
        "verifiedBlocks": stored_blocks + empty_blocks,
        "storedBlocks": stored_blocks,
        "emptyBlocks": empty_blocks,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--prepared", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.source, args.prepared), ensure_ascii=False))
        return 0
    except Exception as error:
        print(f"Prepared raster verification failed: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
