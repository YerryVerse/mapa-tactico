#!/usr/bin/env python3
"""Check a cached WorldPop GeoTIFF container and its pinned grid metadata."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import rasterio


def probe(catalog_path: Path, country: str, source: Path) -> None:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    records = [item for item in catalog["population"]["datasets"] if item["countryCode"] == country]
    if len(records) != 1:
        raise ValueError("Country is not present once in the pinned population catalog")
    expected = records[0]
    with rasterio.open(source) as dataset:
        if dataset.count != 1 or dataset.dtypes != ("float32",) or dataset.crs is None or dataset.crs.to_epsg() != 4326:
            raise ValueError("Source type or CRS differs from the pinned catalog")
        if dataset.width != expected["dimensions"]["width"] or dataset.height != expected["dimensions"]["height"]:
            raise ValueError("Source dimensions differ from the pinned catalog")
        if dataset.nodata is None or float(dataset.nodata) != float(expected["noDataValue"]):
            raise ValueError("Source NoData differs from the pinned catalog")
        if not dataset.is_tiled or dataset.block_shapes != [(512, 512)]:
            raise ValueError("Source block layout differs from the validated converter")
        if dataset.transform.b != 0 or dataset.transform.d != 0 or dataset.transform.a <= 0 or dataset.transform.e >= 0:
            raise ValueError("Source affine transform is unsupported")
        if not all(math.isfinite(value) for value in dataset.transform[:6]):
            raise ValueError("Source affine transform contains non-finite values")
        first = last = None
        windows = 0
        for _, window in dataset.block_windows(1):
            if first is None:
                first = window
            last = window
            windows += 1
        expected_windows = math.ceil(dataset.width / 512) * math.ceil(dataset.height / 512)
        if windows != expected_windows or first is None or last is None:
            raise ValueError("Source tile directory is incomplete")
        dataset.read(1, window=first, masked=False)
        if last != first:
            dataset.read(1, window=last, masked=False)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--country", required=True)
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    try:
        probe(args.catalog, args.country, args.source)
        return 0
    except Exception as error:
        print(f"GeoTIFF probe failed: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
