import type { NormalizedRetailerProduct, RetailerSlug } from "../types";

export interface RetailerAdapterContext {
  signal: AbortSignal;
  feedUrl: string;
  apiKey?: string;
}

export interface RetailerAdapter {
  slug: RetailerSlug;
  displayName: string;
  environmentUrlKey: string;
  environmentApiKey: string;
  sync(context: RetailerAdapterContext): Promise<NormalizedRetailerProduct[]>;
}

export function disabledFeedError(slug: RetailerSlug): never {
  throw new Error(
    `${slug} live synchronization requires an authorized feed URL and RETAILER_IMPORTS_ENABLED=1.`,
  );
}
