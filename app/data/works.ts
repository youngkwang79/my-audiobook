export type Work = {
  id: string;
  title: string;
  thumbnail: string;
  totalEpisodes: number;
  freeEpisodes: number;
};

export const works: Work[] = [
  {
    id: "cheonmujin",
    title: "천무진 봉인된 천재",
    thumbnail: "/thumbnails/cheonmujin.jpg",
    totalEpisodes: 55,
    freeEpisodes: 8,
  },
  {
    id: "hwansaeng-geomjon",
    title: "환생검존",
    thumbnail: "/thumbnails/hwansaeng-geomjon.jpg",
    totalEpisodes: 4,
    freeEpisodes: 3,
  },
];