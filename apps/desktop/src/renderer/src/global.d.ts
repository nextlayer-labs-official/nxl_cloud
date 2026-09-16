import type { SkylyerApi } from "../../shared/types";

declare global {
  interface Window {
    skylyer: SkylyerApi;
  }
}

export {};
