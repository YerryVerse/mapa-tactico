#!/usr/bin/env python3
"""Read FeatureCollection features one at a time without loading the collection."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator


CHUNK_BYTES = 8 * 1024 * 1024


def iter_geojson_features(path: Path) -> Iterator[dict]:
    decoder = json.JSONDecoder()
    with path.open("r", encoding="utf-8") as source:
        buffer = ""
        position = 0
        eof = False

        def fill() -> None:
            nonlocal buffer, eof
            chunk = source.read(CHUNK_BYTES)
            if chunk:
                buffer += chunk
            else:
                eof = True

        def skip_whitespace() -> None:
            nonlocal buffer, position
            while True:
                while position < len(buffer) and buffer[position].isspace():
                    position += 1
                if position > CHUNK_BYTES // 2:
                    buffer = buffer[position:]
                    position = 0
                if position < len(buffer) or eof:
                    return
                fill()

        def current() -> str | None:
            skip_whitespace()
            return buffer[position] if position < len(buffer) else None

        def expect(character: str) -> None:
            nonlocal position
            if current() != character:
                raise ValueError(f"Expected {character!r} while reading {path.name}")
            position += 1

        def read_value():
            nonlocal buffer, position
            skip_whitespace()
            while True:
                try:
                    value, end = decoder.raw_decode(buffer, position)
                    position = end
                    if position > CHUNK_BYTES // 2:
                        buffer = buffer[position:]
                        position = 0
                    return value
                except json.JSONDecodeError as error:
                    if eof:
                        raise ValueError(f"Invalid GeoJSON in {path.name}: {error.msg}") from error
                    fill()

        expect("{")
        first_property = True
        saw_type = False
        saw_features = False
        while current() != "}":
            if not first_property:
                expect(",")
            key = read_value()
            if not isinstance(key, str):
                raise ValueError(f"Invalid top-level GeoJSON key in {path.name}")
            expect(":")
            if key == "features":
                if saw_features:
                    raise ValueError(f"GeoJSON repeats its features array in {path.name}")
                saw_features = True
                expect("[")
                first_feature = True
                while current() != "]":
                    if not first_feature:
                        expect(",")
                    feature = read_value()
                    if not isinstance(feature, dict):
                        raise ValueError(f"GeoJSON feature is not an object in {path.name}")
                    yield feature
                    first_feature = False
                expect("]")
            else:
                value = read_value()
                if key == "type":
                    saw_type = True
                    if value != "FeatureCollection":
                        raise ValueError(f"Expected a GeoJSON FeatureCollection in {path.name}")
            first_property = False
        expect("}")
        if not saw_type or not saw_features:
            raise ValueError(f"GeoJSON FeatureCollection is incomplete in {path.name}")
        skip_whitespace()
        if position < len(buffer) or not eof:
            raise ValueError(f"Trailing content after GeoJSON FeatureCollection in {path.name}")
