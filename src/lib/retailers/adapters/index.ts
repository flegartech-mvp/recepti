import { hoferSiAdapter } from "./hofer-si";
import { lidlSiAdapter } from "./lidl-si";
import { sparSiAdapter } from "./spar-si";

export const retailerAdapters = [
  sparSiAdapter,
  hoferSiAdapter,
  lidlSiAdapter,
] as const;
