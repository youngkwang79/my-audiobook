export type Mission = {
  id: number;
  target: number;
  reward: "buff" | "weapon";
  completed: boolean;
  claimed: boolean;
};

export type CoinDrop = {
  id: number;
  x: number;
  y: number;
  amount: number;
};