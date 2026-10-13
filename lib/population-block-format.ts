const MAGIC = 'MTPOP001';

export const POPULATION_BLOCK_FORMAT_VERSION = 1;
export const POPULATION_BLOCK_WIDTH = 512;
export const POPULATION_BLOCK_HEIGHT = 512;
export const POPULATION_BLOCK_CELLS = POPULATION_BLOCK_WIDTH * POPULATION_BLOCK_HEIGHT;
export const POPULATION_BLOCK_DATA_BYTES = POPULATION_BLOCK_CELLS * Float32Array.BYTES_PER_ELEMENT;
export const POPULATION_BLOCK_MASK_BYTES = POPULATION_BLOCK_CELLS / 8;
export const POPULATION_BLOCK_EXPANDED_BYTES = POPULATION_BLOCK_DATA_BYTES + POPULATION_BLOCK_MASK_BYTES;
export const POPULATION_BLOCK_INDEX_HEADER_BYTES = 76;
export const POPULATION_BLOCK_INDEX_RECORD_BYTES = 16;
export const POPULATION_BLOCK_MAX_COMPRESSED_BYTES = POPULATION_BLOCK_EXPANDED_BYTES + 16_384;

export type PopulationBlockIndex = {
  sourceSha256: string;
  tileColumns: number;
  tileRows: number;
  width: number;
  height: number;
  dataBytes: number;
  tileCount: number;
};

export type PopulationBlockRecord = {
  offset: number;
  compressedBytes: number;
  crc32: number;
};

export type DecodedPopulationBlock = {
  values: Float32Array;
  validMask: Uint8Array;
  isValid(index: number): boolean;
};

function requireInteger(value: number, name: string, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`Invalid population block ${name}`);
}

function parseSha256(bytes: Uint8Array) {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export function readPopulationBlockIndexHeader(buffer: ArrayBuffer, expectedSourceSha256?: string): PopulationBlockIndex {
  if (buffer.byteLength < POPULATION_BLOCK_INDEX_HEADER_BYTES) throw new Error('Population block index is truncated');
  const bytes = new Uint8Array(buffer, 0, POPULATION_BLOCK_INDEX_HEADER_BYTES);
  if (new TextDecoder('ascii').decode(bytes.subarray(0, 8)) !== MAGIC) throw new Error('Population block index format is incompatible');
  const view = new DataView(buffer, 0, POPULATION_BLOCK_INDEX_HEADER_BYTES);
  if (view.getUint32(8, true) !== POPULATION_BLOCK_FORMAT_VERSION) throw new Error('Population block index version is incompatible');
  if (view.getUint16(12, true) !== POPULATION_BLOCK_WIDTH || view.getUint16(14, true) !== POPULATION_BLOCK_HEIGHT) throw new Error('Population block dimensions are incompatible');
  if (view.getUint32(32, true) !== POPULATION_BLOCK_INDEX_RECORD_BYTES) throw new Error('Population block index record layout is incompatible');
  const tileColumns = view.getUint32(16, true);
  const tileRows = view.getUint32(20, true);
  const width = view.getUint32(24, true);
  const height = view.getUint32(28, true);
  const dataBytesBig = view.getBigUint64(36, true);
  if (dataBytesBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Population raster data size exceeds the safe range');
  const dataBytes = Number(dataBytesBig);
  const tileCountBig = BigInt(tileColumns) * BigInt(tileRows);
  if (tileCountBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Population tile count exceeds the safe range');
  const tileCount = Number(tileCountBig);
  requireInteger(tileColumns, 'tile columns', 1, 100_000);
  requireInteger(tileRows, 'tile rows', 1, 100_000);
  requireInteger(width, 'raster width', 1, 100_000_000);
  requireInteger(height, 'raster height', 1, 100_000_000);
  requireInteger(dataBytes, 'data length', 0, Number.MAX_SAFE_INTEGER);
  if (Math.ceil(width / POPULATION_BLOCK_WIDTH) !== tileColumns || Math.ceil(height / POPULATION_BLOCK_HEIGHT) !== tileRows) throw new Error('Population raster dimensions do not match its block index');
  const sourceSha256 = parseSha256(bytes.subarray(44, 76));
  if (expectedSourceSha256 && sourceSha256 !== expectedSourceSha256.toLowerCase()) throw new Error('Population source checksum does not match its manifest');
  if (tileCount > Math.floor((buffer.byteLength - POPULATION_BLOCK_INDEX_HEADER_BYTES) / POPULATION_BLOCK_INDEX_RECORD_BYTES)) throw new Error('Population block index has incomplete records');
  return { sourceSha256, tileColumns, tileRows, width, height, dataBytes, tileCount };
}

export function readPopulationBlockRecord(indexBytes: Uint8Array, index: PopulationBlockIndex, tileColumn: number, tileRow: number): PopulationBlockRecord {
  requireInteger(tileColumn, 'tile column', 0, index.tileColumns - 1);
  requireInteger(tileRow, 'tile row', 0, index.tileRows - 1);
  const recordOffset = POPULATION_BLOCK_INDEX_HEADER_BYTES + (tileRow * index.tileColumns + tileColumn) * POPULATION_BLOCK_INDEX_RECORD_BYTES;
  if (recordOffset + POPULATION_BLOCK_INDEX_RECORD_BYTES > indexBytes.byteLength) throw new Error('Population block index record is missing');
  const view = new DataView(indexBytes.buffer, indexBytes.byteOffset + recordOffset, POPULATION_BLOCK_INDEX_RECORD_BYTES);
  const offsetBig = view.getBigUint64(0, true);
  if (offsetBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Population block offset exceeds the safe range');
  const record = { offset: Number(offsetBig), compressedBytes: view.getUint32(8, true), crc32: view.getUint32(12, true) };
  if (record.compressedBytes === 0) {
    if (record.offset !== 0 || record.crc32 !== 0) throw new Error('Empty population block record is malformed');
    return record;
  }
  requireInteger(record.compressedBytes, 'compressed length', 1, POPULATION_BLOCK_MAX_COMPRESSED_BYTES);
  if (record.offset + record.compressedBytes > index.dataBytes) throw new Error('Population block range exceeds its data object');
  return record;
}

export function populationBlockCrc32(bytes: Uint8Array) {
  let crc = 0xffff_ffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb8_8320 : 0);
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

async function inflatePopulationBlock(compressed: Uint8Array) {
  if (compressed.byteLength < 6 || compressed.byteLength > POPULATION_BLOCK_MAX_COMPRESSED_BYTES) throw new Error('Population block compressed length is invalid');
  const transferable = new Uint8Array(compressed.byteLength);
  transferable.set(compressed);
  const stream = new Blob([transferable]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > POPULATION_BLOCK_EXPANDED_BYTES) {
        await reader.cancel();
        throw new Error('Population block expands beyond its memory limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (length !== POPULATION_BLOCK_EXPANDED_BYTES) throw new Error('Population block expanded size is incompatible');
  const expanded = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    expanded.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return expanded;
}

export async function decodePopulationBlock(compressed: Uint8Array, record: PopulationBlockRecord): Promise<DecodedPopulationBlock> {
  if (record.compressedBytes !== compressed.byteLength || record.compressedBytes < 1 || record.compressedBytes > POPULATION_BLOCK_MAX_COMPRESSED_BYTES) throw new Error('Population block length does not match its index');
  const expanded = await inflatePopulationBlock(compressed);
  if (populationBlockCrc32(expanded) !== record.crc32) throw new Error('Population block checksum is invalid');
  const data = expanded.subarray(0, POPULATION_BLOCK_DATA_BYTES);
  const mask = expanded.subarray(POPULATION_BLOCK_DATA_BYTES);
  const values = new Float32Array(POPULATION_BLOCK_CELLS);
  if (new Uint8Array(new Uint16Array([1]).buffer)[0] === 1) {
    values.set(new Float32Array(data.buffer, data.byteOffset, POPULATION_BLOCK_CELLS));
  } else {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let index = 0; index < POPULATION_BLOCK_CELLS; index++) values[index] = view.getFloat32(index * Float32Array.BYTES_PER_ELEMENT, true);
  }
  return { values, validMask: mask, isValid(index: number) { return (mask[index >>> 3] & (1 << (index & 7))) !== 0; } };
}
