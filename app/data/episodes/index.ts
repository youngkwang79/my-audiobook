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

export function getEpisodeByWorkAndId(
  workId: string,
  episodeId: string
): Episode | undefined {
  return getEpisodesByWork(workId).find(
    (ep) => String(ep.id) === String(episodeId)
  );
}

export function getTotalPartsByWork(
  workId: string,
  episodeId: string
): number {
  return getEpisodeByWorkAndId(workId, episodeId)?.parts ?? 1;
}