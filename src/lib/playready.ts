import { swapEndian } from './utilities.js'

/**
 * Convert a hex-encoded PlayReady key id into its base64, endian-swapped form.
 */
export const convertKey = (hexStringKey: string): string => {
  return swapEndian(hexStringKey).toString('base64')
}

/**
 * Revert a base64, endian-swapped PlayReady key id back to plain hex.
 */
export const revertKey = (base64StringKey: string): string => {
  const hex = Buffer.from(base64StringKey, 'base64').toString('hex')
  return swapEndian(hex).toString('hex')
}
