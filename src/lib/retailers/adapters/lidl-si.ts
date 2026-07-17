import { disabledFeedError, type RetailerAdapter } from "./types";

export const lidlSiAdapter: RetailerAdapter = {
  slug: "lidl-si",
  displayName: "Lidl Slovenija",
  environmentUrlKey: "LIDL_SI_FEED_URL",
  environmentApiKey: "LIDL_SI_API_KEY",
  async sync() {
    return disabledFeedError("lidl-si");
  },
};
