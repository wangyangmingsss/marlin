import { describe, it, expect } from 'vitest'
import { ulidToBytes, bytesToHex, hexToBytes } from '../src/ulid'

describe('ulidToBytes', () => {
  it('generates 16 bytes', () => {
    const bytes = ulidToBytes()
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(16)
  })

  it('different calls generate different bytes', () => {
    const b1 = ulidToBytes()
    const b2 = ulidToBytes()
    expect(bytesToHex(b1)).not.toBe(bytesToHex(b2))
  })

  it('accepts a ULID string', () => {
    const id = '01HGW3A0M8P1RABCDEFGH12345'
    const bytes = ulidToBytes(id)
    expect(bytes.length).toBe(16)
  })

  it('is deterministic for same input', () => {
    const id = '01HGW3A0M8P1RABCDEFGH12345'
    const b1 = ulidToBytes(id)
    const b2 = ulidToBytes(id)
    expect(bytesToHex(b1)).toBe(bytesToHex(b2))
  })

  it('throws on invalid ULID character', () => {
    expect(() => ulidToBytes('01HGW3A0M8P1RABCDEFGH1234U')).toThrow('Invalid ULID character')
  })
})

describe('bytesToHex', () => {
  it('converts bytes to hex string', () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 255])
    expect(bytesToHex(bytes)).toBe('00010f10ff')
  })

  it('handles empty array', () => {
    expect(bytesToHex(new Uint8Array(0))).toBe('')
  })

  it('pads single digit values', () => {
    const bytes = new Uint8Array([0, 5, 10])
    expect(bytesToHex(bytes)).toBe('00050a')
  })
})

describe('hexToBytes', () => {
  it('converts hex string to bytes', () => {
    const bytes = hexToBytes('00010f10ff')
    expect(Array.from(bytes)).toEqual([0, 1, 15, 16, 255])
  })

  it('handles empty string', () => {
    const bytes = hexToBytes('')
    expect(bytes.length).toBe(0)
  })

  it('roundtrips with bytesToHex', () => {
    const original = new Uint8Array([42, 128, 255, 0, 1])
    const hex = bytesToHex(original)
    const recovered = hexToBytes(hex)
    expect(Array.from(recovered)).toEqual(Array.from(original))
  })
})
