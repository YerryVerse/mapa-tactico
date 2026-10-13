import {deflateSync} from 'node:zlib';
import {describe,it,expect} from 'vitest';
import {
  decodePopulationBlock,
  POPULATION_BLOCK_CELLS,
  POPULATION_BLOCK_DATA_BYTES,
  POPULATION_BLOCK_EXPANDED_BYTES,
  POPULATION_BLOCK_INDEX_HEADER_BYTES,
  POPULATION_BLOCK_INDEX_RECORD_BYTES,
  populationBlockCrc32,
  readPopulationBlockIndexHeader,
  readPopulationBlockRecord
} from '../../lib/population-block-format';

const sourceSha256='0123456789abcdef'.repeat(4);

function makeIndex(){
  const index=new Uint8Array(POPULATION_BLOCK_INDEX_HEADER_BYTES+POPULATION_BLOCK_INDEX_RECORD_BYTES*2);
  const view=new DataView(index.buffer);
  index.set(new TextEncoder().encode('MTPOP001'),0);
  view.setUint32(8,1,true);
  view.setUint16(12,512,true);
  view.setUint16(14,512,true);
  view.setUint32(16,2,true);
  view.setUint32(20,1,true);
  view.setUint32(24,600,true);
  view.setUint32(28,512,true);
  view.setUint32(32,16,true);
  view.setBigUint64(36,BigInt(12),true);
  index.set(Uint8Array.from(sourceSha256.match(/../g)!,byte=>Number.parseInt(byte,16)),44);
  const firstRecord=POPULATION_BLOCK_INDEX_HEADER_BYTES;
  view.setBigUint64(firstRecord,BigInt(0),true);
  view.setUint32(firstRecord+8,12,true);
  view.setUint32(firstRecord+12,0x12345678,true);
  return index;
}

describe('population raster block format',()=>{
  it('reads the pinned header and bounded row-major index records',()=>{
    const bytes=makeIndex(),parsed=readPopulationBlockIndexHeader(bytes.buffer,sourceSha256);
    expect(parsed).toMatchObject({tileColumns:2,tileRows:1,width:600,height:512,dataBytes:12,tileCount:2});
    expect(readPopulationBlockRecord(bytes,parsed,0,0)).toMatchObject({offset:0,compressedBytes:12,crc32:0x12345678});
    expect(readPopulationBlockRecord(bytes,parsed,1,0)).toMatchObject({offset:0,compressedBytes:0,crc32:0});
    expect(()=>readPopulationBlockRecord(bytes,parsed,2,0)).toThrow();
    expect(()=>readPopulationBlockIndexHeader(bytes.buffer,'f'.repeat(64))).toThrow('checksum');
  });

  it('restores Float32 cells and an explicit NoData bit mask',async()=>{
    const expanded=new Uint8Array(POPULATION_BLOCK_EXPANDED_BYTES),view=new DataView(expanded.buffer);
    view.setFloat32(0,1.25,true);
    view.setFloat32(4,-99999,true);
    view.setFloat32(8,8.5,true);
    expanded[POPULATION_BLOCK_DATA_BYTES]=0b00000101;
    const compressed=deflateSync(expanded),record={offset:0,compressedBytes:compressed.byteLength,crc32:populationBlockCrc32(expanded)};
    const decoded=await decodePopulationBlock(compressed,record);
    expect(decoded.values[0]).toBe(1.25);
    expect(decoded.values[1]).toBe(-99999);
    expect(decoded.values[2]).toBe(8.5);
    expect(decoded.isValid(0)).toBe(true);
    expect(decoded.isValid(1)).toBe(false);
    expect(decoded.isValid(2)).toBe(true);
    expect(decoded.values).toHaveLength(POPULATION_BLOCK_CELLS);
  });

  it('rejects truncated data, incompatible expansion and corrupt checksums',async()=>{
    const raw=new Uint8Array(POPULATION_BLOCK_EXPANDED_BYTES),compressed=deflateSync(raw);
    await expect(decodePopulationBlock(compressed,{offset:0,compressedBytes:compressed.length,crc32:0})).rejects.toThrow('checksum');
    await expect(decodePopulationBlock(compressed.subarray(0,compressed.length-2),{offset:0,compressedBytes:compressed.length-2,crc32:0})).rejects.toThrow();
    await expect(decodePopulationBlock(deflateSync(new Uint8Array(POPULATION_BLOCK_DATA_BYTES)),{offset:0,compressedBytes:deflateSync(new Uint8Array(POPULATION_BLOCK_DATA_BYTES)).length,crc32:0})).rejects.toThrow('expanded size');
    expect(POPULATION_BLOCK_DATA_BYTES).toBe(1_048_576);
  });
});
