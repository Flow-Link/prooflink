/**
 * Known sanctioned addresses for offline/testing mode.
 *
 * These addresses are publicly designated by OFAC and appear on the SDN list.
 * This is NOT a complete list — use the Chainalysis API for production screening.
 * Last updated: 2026-03-20 from OFAC SDN additions.
 */

/** OFAC SDN-designated Ethereum addresses (Tornado Cash and associated) */
export const OFAC_SDN_ETH_ADDRESSES: ReadonlySet<string> = new Set([
  // Tornado Cash designated addresses (August 2022, updated 2023-2025)
  "0x8589427373d6d84e98730d7795d8f6f8731fda16",
  "0x722122df12d4e14e13ac3b6895a86e84145b6967",
  "0xdd4c48c0b24039969fc16d1cdf626eab821d3384",
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
  "0xd96f2b1ef7ed222d3897f19d0aded88bcf4d8eab",
  "0x4736dcf1b7a3d580672cce6e7c65cd5cc9cfbfa9",
  "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3",
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",
  "0xa160cdab225685da1d56aa342ad8841c3b53f291",
  "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144",
  "0xf60dd140cff0706bae9cd734ac3683f51e56010b",
  "0x22aaa7720ddd5388a3c0a3333430953c68f1849b",
  "0xba214c1c1928a32bffe790263e38b4af9bfcd659",
  "0xb1c8094b234dce6e03f10a5b673c1d8c69739a00",
  "0x527653ea119f3e6a1f5bd18fbf4714081d7b31ce",
  "0x58e8dcc13be9780fc42e8723d8ead4cf46943df2",
  "0xd691f27f38b395864ea86cfc7253969b409c362d",
  "0xaeaac358560e11f52454d997aaff2c5731b6f8a6",
  "0x1356c899d8c9467c7f71c195612f8a395abf2f0a",
  "0xa60c772958a3ed56c1f15dd055ba37ac8e523a0d",
  "0x169ad27a470d064dede56a2d3ff727986b15d52b",
  "0x0836222f2b2b24a3f36f98668ed8f0b38d1a872f",
  "0x178169b423a011fff22b9e3f3abea13414ddd0f1",
  "0x610b717796ad172b316836ac95a2ffad065ceab4",
  "0xbb93e510bbcd0b7beb5a853875f9ec60275cf498",

  // Lazarus Group (North Korea) associated addresses
  "0x098b716b8aaf21512996dc57eb0615e2383e2f96",
  "0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b",
  "0x3cffd56b47b7b41c56258d9c7731abadc360e460",
  "0x53b6936513e738f44fb50d2b9476730c0ab3bfc1",

  // Garantex exchange (April 2022 OFAC designation)
  "0x6acdfba02d390b97ac2b2d42a63e85293bcc160e",

  // Blender.io
  "0x94c9eb5b4e49faac0e44b7e5ef1f57ce71c0b724",
]);

/** OFAC SDN-designated Bitcoin addresses (subset for testing) */
export const OFAC_SDN_BTC_ADDRESSES: ReadonlySet<string> = new Set([
  "12QtD5BFwRsdNsAZY76UVE1xyCGNTojH9h",
  "1KYiKJEfdJtap9QX2v9BXJMpz2SfU4pgZw",
  "17p9Qs3JmZfPDKb6NTWzfp9Udfes1ZzFF2",
]);

/**
 * Check if an address is in the known OFAC SDN list (offline mode).
 * Address comparison is case-insensitive for EVM addresses.
 */
export function isKnownSanctionedAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    OFAC_SDN_ETH_ADDRESSES.has(normalized) ||
    OFAC_SDN_BTC_ADDRESSES.has(normalized)
  );
}

/**
 * All known sanctioned addresses combined (for iteration/export).
 */
export function getAllKnownSanctionedAddresses(): string[] {
  return [
    ...Array.from(OFAC_SDN_ETH_ADDRESSES),
    ...Array.from(OFAC_SDN_BTC_ADDRESSES),
  ];
}
