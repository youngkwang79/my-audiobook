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
  subtitle?: string;
  badge?: string;
  views?: string;
  exclusive?: boolean;
};

export const works: Work[] = [
  {
    id: "cheonmujin",
    title: "천무진 : 봉인된 천재",
    description: "봉인된 천재가 다시 깨어나 무림의 질서를 뒤흔든다",
    thumbnail: "/thumbnails/cheonmujin.png",
    episodeCount: 54,
    totalEpisodes: 54,
    freeEpisodes: 8,
    status: "연재중",
    featured: true,
    subtitle: "[성장] [복수] [미스터리]",
    badge: "인기",
    views: "0",
    exclusive: true,
  },
  {
    id: "hwansaeng-geomjon",
    title: "환생검존",
    description: "죽음에서 돌아온 검존, 무너진 강호의 판을 다시 뒤엎는다",
    thumbnail: "/thumbnails/hwansaeng-geomjon.png",
    episodeCount: 52,
    totalEpisodes: 52,
    freeEpisodes: 3,
    status: "완결",
    featured: true,
    subtitle: "[환생물] [복수극] [정통무협]",
    badge: "신작",
    views: "0",
    exclusive: true,
  },
  {
    id: "myeolsagwirim",
    title: "멸사귀림(滅邪歸林)",
    description: `[회귀물] [복수극] [의선] [치밀한 복수] [사이다]

스무 해 동안 동굴에 갇혀 세 노괴의 부속품으로 살았던 의선 초무영.
불사초를 만들어 바쳤으나, 돌아온 것은 놈들의 배신과 가족의 비극이었다.

"내가 다시 태어날 수만 있다면, 너희를 필히 죽이리라."

처절한 죽음 끝에 7살로 돌아왔다.
이제는 입장이 바뀌었다.
나는 그들이 모르는 미래를 알고, 그들은 내 의술의 무서움을 모른다.

가족을 지키고 놈들을 파멸시키기 위해, 어린 의선의 치밀하고 잔혹한 복수극이 시작된다!`,
    thumbnail: "/thumbnails/myeolsagwirim.png",
    episodeCount: 0,
    totalEpisodes: 100,
    freeEpisodes: 0,
    status: "준비중",
    featured: true,
    subtitle: "[회귀물] [복수극] [의선]",
    badge: "신작",
    views: "0",
    exclusive: true,
  },
];