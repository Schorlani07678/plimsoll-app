import type { Page } from "@playwright/test";
import type { IndexerAsset, IndexerReporter } from "@plimsoll/sdk";

/** A real v0.1 testnet SAC, so the asset page accepts it as a query value. */
export const ASSET_SAC = "CCHPT4TEJDPZQDSUVW3NP6A35ROGV4WEFZKT45SKWYCFZSUB7R5HIM7S";
export const ISSUER = "GBIE3ANCRVCBWETUZXWYKRMP27LQVJHX757XXAQUT3LYHVTNFPPPXEY4";
const TRANSCRIBER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const POSTER = "GCCMGQ3UGITN2HUUSQKTDMBFZ34QQTKMODR56NT26JMPH2MHVYWZMXNE";

export const REPORTERS: IndexerReporter[] = [
  {
    address: ISSUER,
    role: "auditor",
    name: "Alice Audit",
    updated_at: "2026-11-20T00:00:00Z",
  },
  {
    address: TRANSCRIBER,
    role: "transcriber",
    name: "Bob Transcriber",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    address: POSTER,
    role: "supply_poster",
    name: "Carol Poster",
    updated_at: "2026-11-01T00:00:00Z",
  },
];

export function assetFixture(sac: string): IndexerAsset {
  return {
    sac,
    code: "PUSD",
    issuer: ISSUER,
    listed_ledger: 1000,
    listed_at: "2026-11-01T00:00:00Z",
    toml: {
      home_domain: "example.com",
      org_name: "Example Trust",
      currency: {
        code: "PUSD",
        issuer: ISSUER,
        name: "Example USD",
        is_asset_anchored: true,
        anchor_asset: "USD",
        attestation_of_reserve: "https://example.com/attestation.pdf",
      },
    },
    supply: {
      amount: "1000000000",
      ledger: 1200,
      posted_at: "2026-11-20T00:00:00Z",
      breakdown_hash: "a".repeat(64),
      poster: POSTER,
      tx_hash: "b".repeat(64),
      source: "event",
    },
    reports: {
      transcribed: {
        tier: "transcribed",
        amount: "1000000000",
        as_of: "2026-11-19T00:00:00Z",
        posted_at: "2026-11-20T00:00:00Z",
        reporter: TRANSCRIBER,
        doc_hash: "c".repeat(64),
        doc_uri: "https://example.com/reserve.pdf",
        tx_hash: "d".repeat(64),
        source: "event",
      },
    },
    coverage: {
      bps: 10000,
      ratio: "1.00",
      tier: "transcribed",
      supply: "1000000000",
      reserves: "1000000000",
      supply_ledger: 1200,
      supply_posted_at: "2026-11-20T00:00:00Z",
      report_as_of: "2026-11-19T00:00:00Z",
      report_age_seconds: 86400,
      supply_age_seconds: 86400,
      reporter: TRANSCRIBER,
      doc_uri: "https://example.com/reserve.pdf",
    },
  };
}

/**
 * Answers the indexer endpoints the pages use with fixed data, so an
 * accessibility run never depends on the network or on testnet state.
 */
export async function mockIndexer(page: Page): Promise<void> {
  await page.route("**/v1/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/v1/reporters") {
      return route.fulfill({ json: { reporters: REPORTERS } });
    }
    if (pathname === "/v1/assets") {
      return route.fulfill({ json: { assets: [assetFixture(ASSET_SAC)] } });
    }
    if (pathname === `/v1/assets/${ASSET_SAC}`) {
      return route.fulfill({ json: assetFixture(ASSET_SAC) });
    }
    return route.fulfill({ status: 404, json: { error: "not mocked" } });
  });
}
