export type Work = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  episodeCount: number;
  totalEpisodes: number;
  freeEpisodes: number;
  status: "연재중" | "완결" | "준비중";
  featured?: boolean;
};

export const works: Work[] = [
  {
    id: "cheonmujin",
    title: "천무진",
    description: "봉인된 천재가 다시 깨어나 무림의 질서를 뒤흔든다",
    thumbnail: "/thumbnails/cheonmujin.jpg",
    episodeCount: 54,
    totalEpisodes: 54,
    freeEpisodes: 8,
    status: "연재중",
    featured: true,
  },
  {
    id: "hwansaeng-geomjon",
    title: "환생검존",
    description: "죽음에서 돌아온 검존, 무너진 강호의 판을 다시 뒤엎는다",
    thumbnail: "/thumbnails/hwansaeng-geomjon.jpg",
    episodeCount: 52,
    totalEpisodes: 52,
    freeEpisodes: 3,
    status: "완결",
    featured: true,
  },
];