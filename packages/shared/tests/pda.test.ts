import { describe, it, expect } from 'vitest'
import { PublicKey } from '@solana/web3.js'
import {
  deriveMerchantPda,
  deriveInvoicePda,
  derivePlanPda,
  deriveSubscriptionPda,
} from '../src/pda'

const PROGRAM_ID = new PublicKey('MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ')

describe('deriveMerchantPda', () => {
  it('derives a valid PDA', () => {
    const authority = PublicKey.unique()
    const [pda, bump] = deriveMerchantPda(authority, PROGRAM_ID)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
    expect(bump).toBeLessThanOrEqual(255)
  })

  it('is deterministic', () => {
    const authority = PublicKey.unique()
    const [pda1] = deriveMerchantPda(authority, PROGRAM_ID)
    const [pda2] = deriveMerchantPda(authority, PROGRAM_ID)
    expect(pda1.equals(pda2)).toBe(true)
  })

  it('different authorities produce different PDAs', () => {
    const auth1 = PublicKey.unique()
    const auth2 = PublicKey.unique()
    const [pda1] = deriveMerchantPda(auth1, PROGRAM_ID)
    const [pda2] = deriveMerchantPda(auth2, PROGRAM_ID)
    expect(pda1.equals(pda2)).toBe(false)
  })
})

describe('deriveInvoicePda', () => {
  it('derives a valid PDA', () => {
    const merchant = PublicKey.unique()
    const invoiceId = new Uint8Array(16).fill(1)
    const [pda, bump] = deriveInvoicePda(merchant, invoiceId, PROGRAM_ID)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
  })

  it('different invoice IDs produce different PDAs', () => {
    const merchant = PublicKey.unique()
    const id1 = new Uint8Array(16).fill(1)
    const id2 = new Uint8Array(16).fill(2)
    const [pda1] = deriveInvoicePda(merchant, id1, PROGRAM_ID)
    const [pda2] = deriveInvoicePda(merchant, id2, PROGRAM_ID)
    expect(pda1.equals(pda2)).toBe(false)
  })
})

describe('derivePlanPda', () => {
  it('derives a valid PDA', () => {
    const merchant = PublicKey.unique()
    const planId = new Uint8Array(16).fill(3)
    const [pda, bump] = derivePlanPda(merchant, planId, PROGRAM_ID)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
  })

  it('is deterministic', () => {
    const merchant = PublicKey.unique()
    const planId = new Uint8Array(16).fill(4)
    const [pda1] = derivePlanPda(merchant, planId, PROGRAM_ID)
    const [pda2] = derivePlanPda(merchant, planId, PROGRAM_ID)
    expect(pda1.equals(pda2)).toBe(true)
  })
})

describe('deriveSubscriptionPda', () => {
  it('derives a valid PDA', () => {
    const plan = PublicKey.unique()
    const customer = PublicKey.unique()
    const [pda, bump] = deriveSubscriptionPda(plan, customer, PROGRAM_ID)
    expect(pda).toBeInstanceOf(PublicKey)
    expect(bump).toBeGreaterThanOrEqual(0)
  })

  it('different customers produce different PDAs', () => {
    const plan = PublicKey.unique()
    const cust1 = PublicKey.unique()
    const cust2 = PublicKey.unique()
    const [pda1] = deriveSubscriptionPda(plan, cust1, PROGRAM_ID)
    const [pda2] = deriveSubscriptionPda(plan, cust2, PROGRAM_ID)
    expect(pda1.equals(pda2)).toBe(false)
  })
})
