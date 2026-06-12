import { supabaseAdmin } from "./supabaseAdmin";

interface Transaction {
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface RewardBucket {
  amount: number;
  remaining: number;
  created_at: Date;
}

export async function syncAndGetWallet(userId: string, userCreatedAt?: string) {
  // 1. wallets 테이블에서 사용자 지갑 조회
  let { data: wallet, error: walletErr } = await supabaseAdmin
    .from("wallets")
    .select("points, reward_points, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (walletErr) {
    console.error("Error reading wallet in syncAndGetWallet:", walletErr);
    throw walletErr;
  }

  // 지갑이 없으면 기본 0 코인, 0 리워드 코인으로 생성
  if (!wallet) {
    const signupTime = userCreatedAt || new Date().toISOString();
    const { data: newWallet, error: initError } = await supabaseAdmin
      .from("wallets")
      .insert({
        user_id: userId,
        points: 0,
        reward_points: 0,
        updated_at: signupTime,
      })
      .select("points, reward_points, updated_at")
      .maybeSingle();

    if (initError || !newWallet) {
      console.error("Wallet init failed in syncAndGetWallet:", initError);
      throw initError || new Error("wallet_init_failed");
    }

    wallet = newWallet;

    // 거래 내역 기록
    await supabaseAdmin
      .from("point_transactions")
      .insert([
        {
          user_id: userId,
          amount: 0,
          transaction_type: "charge",
          description: "신규 가입 코인 지급",
          created_at: signupTime,
         },
        {
          user_id: userId,
          amount: 0,
          transaction_type: "reward",
          description: "신규 가입 리워드 코인 지급",
          created_at: signupTime,
        },
      ]);
  }

  // 2. point_transactions에서 모든 거래 내역 조회
  const { data: dbTxList, error: txErr } = await supabaseAdmin
    .from("point_transactions")
    .select("amount, transaction_type, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (txErr) {
    console.error("Error reading transactions in syncAndGetWallet:", txErr);
    throw txErr;
  }

  const txList: Transaction[] = dbTxList || [];

  // 신규 가입 코인 지급 내역이 없으면 가상 가입 내역 추가 (레거시 유저 호환성)
  const hasSignupCharge = txList.some(
    (t) => t.transaction_type === "charge" && t.description === "신규 가입 코인 지급"
  );
  if (!hasSignupCharge) {
    const signupTime = userCreatedAt || wallet.updated_at || new Date().toISOString();
    txList.unshift(
      {
        amount: 0,
        transaction_type: "charge",
        description: "신규 가입 코인 지급",
        created_at: signupTime,
      },
      {
        amount: 0,
        transaction_type: "reward",
        description: "신규 가입 리워드 코인 지급",
        created_at: signupTime,
      }
    );
  }

  // 3. 시뮬레이션 시작
  let paidPoints = 0;
  const rewardBuckets: RewardBucket[] = [];
  const now = new Date();
  const EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30일

  for (const tx of txList) {
    const txTime = new Date(tx.created_at);

    // 해당 거래 시점에 유효기간(30일)이 만료된 리워드 코인 소멸 처리
    for (const bucket of rewardBuckets) {
      if (txTime.getTime() - bucket.created_at.getTime() >= EXPIRATION_MS) {
        bucket.remaining = 0;
      }
    }

    if (tx.transaction_type === "charge") {
      paidPoints += tx.amount;
    } else if (tx.transaction_type === "reward") {
      rewardBuckets.push({
        amount: tx.amount,
        remaining: tx.amount,
        created_at: txTime,
      });
    } else if (tx.transaction_type === "use") {
      let useAmount = Math.abs(tx.amount);

      // 1. 유료 코인에서 우선 차감
      if (paidPoints >= useAmount) {
        paidPoints -= useAmount;
        useAmount = 0;
      } else {
        useAmount -= paidPoints;
        paidPoints = 0;
      }

      // 2. 남은 사용액은 리워드 코인 버킷에서 차감 (오래된 순)
      if (useAmount > 0) {
        for (const bucket of rewardBuckets) {
          // 거래 시점에 이미 만료된 버킷은 차감 불가
          if (txTime.getTime() - bucket.created_at.getTime() >= EXPIRATION_MS) {
            bucket.remaining = 0;
            continue;
          }

          if (bucket.remaining > 0) {
            if (bucket.remaining >= useAmount) {
              bucket.remaining -= useAmount;
              useAmount = 0;
              break;
            } else {
              useAmount -= bucket.remaining;
              bucket.remaining = 0;
            }
          }
        }
      }
    }
  }

  // 4. 현재 시점(now) 기준 만료 처리
  for (const bucket of rewardBuckets) {
    if (now.getTime() - bucket.created_at.getTime() >= EXPIRATION_MS) {
      bucket.remaining = 0;
    }
  }

  const finalRewardPoints = rewardBuckets.reduce((sum, b) => sum + b.remaining, 0);

  // 5. DB 지갑 테이블과 비교 후 불일치 시 업데이트
  const currentDbPaid = Number(wallet.points ?? 0);
  const currentDbReward = Number(wallet.reward_points ?? 0);

  if (paidPoints !== currentDbPaid || finalRewardPoints !== currentDbReward) {
    console.log(
      `Wallet sync needed for ${userId}. DB: (${currentDbPaid}P, ${currentDbReward}R), Simulated: (${paidPoints}P, ${finalRewardPoints}R)`
    );

    const { error: updateErr } = await supabaseAdmin
      .from("wallets")
      .upsert(
        {
          user_id: userId,
          points: paidPoints,
          reward_points: finalRewardPoints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (updateErr) {
      console.error("Error updating wallets table in syncAndGetWallet:", updateErr);
    } else {
      wallet.points = paidPoints;
      wallet.reward_points = finalRewardPoints;
    }
  }

  return {
    points: wallet.points,
    reward_points: wallet.reward_points,
  };
}
