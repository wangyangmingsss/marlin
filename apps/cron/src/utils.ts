import { createHash } from 'crypto';

/**
 * Compute the 8-byte Anchor instruction discriminator.
 * Anchor convention: sha256("global:<instruction_name>")[0..8]
 */
export function getInstructionDiscriminator(name: string): Buffer {
  const hash = createHash('sha256').update(`global:${name}`).digest();
  return hash.subarray(0, 8);
}

/**
 * Sleep for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
