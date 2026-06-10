export type Episode = {
  id: string;
  title: string;
  locked: boolean;
  audioUrl: string;
  parts: number;
};

import { cheonmujinEpisodes } from "./cheonmujin";
import { hwansaengGeomjonEpisodes } from "./hwansaeng-geomjon";

export function getEpisodesByWork(workId: string): Episode[] {
  switch (workId) {
    case "cheonmujin":
      return cheonmujinEpisodes;
    case "hwansaeng-geomjon":
      return hwansaengGeomjonEpisodes;
    default:
      return [];
  }
}