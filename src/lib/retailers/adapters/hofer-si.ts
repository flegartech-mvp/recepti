import { disabledFeedError, type RetailerAdapter } from "./types";

export const hoferSiAdapter: RetailerAdapter = {
  slug: "hofer-si",
  displayName: "HOFER Slovenija",
  environmentUrlKey: "HOFER_SI_FEED_URL",
  environmentApiKey: "HOFER_SI_API_KEY",
  async sync() {
    return disabledFeedError("hofer-si");
  },
};
