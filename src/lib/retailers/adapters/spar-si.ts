import { disabledFeedError, type RetailerAdapter } from "./types";

export const sparSiAdapter: RetailerAdapter = {
  slug: "spar-si",
  displayName: "SPAR Slovenija",
  environmentUrlKey: "SPAR_SI_FEED_URL",
  environmentApiKey: "SPAR_SI_API_KEY",
  async sync() {
    return disabledFeedError("spar-si");
  },
};
