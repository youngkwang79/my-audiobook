"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// 중개수수료 요율 계산 함수 (한국 표준 주택 매매 기준)
function calculateBrokerageFee(price: number): { fee: number; rate: number } {
  // price 단위: 원
  const priceInManwon = price / 10000;
  let rate = 0;
  let maxFee = Infinity;

  if (priceInManwon < 5000) {
    rate = 0.006;
    maxFee = 250000;
  } else if (priceInManwon < 20000) {
    rate = 0.005;
    maxFee = 800000;
  } else if (priceInManwon < 90000) {
    rate = 0.004;
  } else if (priceInManwon < 120000) {
    rate = 0.005;
  } else if (priceInManwon < 150000) {
    rate = 0.006;
  } else {
    rate = 0.007;
  }

  let fee = price * rate;
  if (fee > maxFee) {
    fee = maxFee;
  }

  return { fee: Math.floor(fee), rate: rate * 100 };
}

// 한국 소득세법상 양도소득세 기본세율(누진세율) 계산 함수 (2025/2026 개정 기준)
function calculateProgressiveTax(gain: number): number {
  if (gain <= 0) return 0;
  
  let tax = 0;
  if (gain <= 14000000) {
    tax = gain * 0.06;
  } else if (gain <= 50000000) {
    tax = gain * 0.15 - 1260000;
  } else if (gain <= 88000000) {
    tax = gain * 0.24 - 5760000;
  } else if (gain <= 150000000) {
    tax = gain * 0.35 - 15440000;
  } else if (gain <= 300000000) {
    tax = gain * 0.38 - 19940000;
  } else if (gain <= 500000000) {
    tax = gain * 0.40 - 25940000;
  } else if (gain <= 1000000000) {
    tax = gain * 0.42 - 35940000;
  } else {
    tax = gain * 0.45 - 65940000;
  }

  // 양도소득세 기본세액 + 지방소득세(10%)
  return Math.floor(tax * 1.1);
}

// 조정대상지역 2주택자 양도소득세 중과세율 (기본세율 + 20%p 가산) 계산 함수
function calculateHeavyTax2Houses(gain: number): number {
  if (gain <= 0) return 0;

  let tax = 0;
  // 각 구간별 기본세율에 20%p를 추가한 세율을 적용합니다.
  if (gain <= 14000000) {
    tax = gain * (0.06 + 0.20);
  } else if (gain <= 50000000) {
    tax = gain * (0.15 + 0.20) - 1260000;
  } else if (gain <= 88000000) {
    tax = gain * (0.24 + 0.20) - 5760000;
  } else if (gain <= 150000000) {
    tax = gain * (0.35 + 0.20) - 15440000;
  } else if (gain <= 300000000) {
    tax = gain * (0.38 + 0.20) - 19940000;
  } else if (gain <= 500000000) {
    tax = gain * (0.40 + 0.20) - 25940000;
  } else if (gain <= 1000000000) {
    tax = gain * (0.42 + 0.20) - 35940000;
  } else {
    tax = gain * (0.45 + 0.20) - 65940000;
  }

  // 양도소득세 중과세액 + 지방소득세(10%)
  return Math.floor(tax * 1.1);
}

// 법무사 보수 및 등기 관련 비용 자동 계산 함수 (한국 대한법무사협회 보수 기준 및 채권 할인료 추정)
function calculateLegalFee(price: number): number {
  const basicFee = 70000;
  let rateFee = 0;

  if (price < 50000000) {
    rateFee = price * 0.001;
  } else if (price < 100000000) {
    rateFee = 120000 + (price - 50000000) * 0.0008;
  } else if (price < 300000000) {
    rateFee = 160000 + (price - 100000000) * 0.0006;
  } else if (price < 500000000) {
    rateFee = 280000 + (price - 300000000) * 0.0005;
  } else if (price < 1000000000) {
    rateFee = 380000 + (price - 500000000) * 0.0004;
  } else {
    rateFee = 580000 + (price - 1000000000) * 0.0003;
  }

  const serviceFee = basicFee + rateFee;
  const additionalExpenses = 150000; // 대행/서류 실비
  const bondDiscountCost = price * 0.0015; // 채권할인료 약식추정 (0.15%)
  const vat = serviceFee * 0.1; // 부가세 10%

  return Math.floor(serviceFee + additionalExpenses + bondDiscountCost + vat);
}

// 쉼표 포맷 도우미
function formatKrw(value: number): string {
  if (value === 0) return "0원";
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })
    .format(value)
    .replace("₩", "") + "원";
}

function formatKrwEok(value: number): string {
  if (value === 0) return "0원";
  const eok = Math.floor(value / 100000000);
  const remainder = value % 100000000;
  const remainderMan = Math.floor(remainder / 10000);
  
  let result = "";
  if (eok > 0) result += `${eok}억 `;
  if (remainderMan > 0) result += `${remainderMan}만`;
  
  return (result || "0") + "원";
}

export default function CalculatorPage() {
  // --- 기존 주택 (시흥 아파트) 입력 상태 ---
  const [siheungPurchasePrice, setSiheungPurchasePrice] = useState<number>(350000000); // 3억 5천만
  const [siheungSellPrice, setSiheungSellPrice] = useState<number>(500000000); // 5억
  const [siheungHoldMonths, setSiheungHoldMonths] = useState<number>(7); // 현재 거주한 기간(개월)
  const [siheungMovingCost, setSiheungMovingCost] = useState<number>(2500000); // 이사비용 250만
  const [siheungBrokerageRate, setSiheungBrokerageRate] = useState<number>(0.4); // 시흥 중개수수료율 (%)
  const [isAutoSiheungBrokerage, setIsAutoSiheungBrokerage] = useState<boolean>(true); // 시흥 중개수수료 자동 계산 여부

  // --- 신규 주택 (구리 지주택) 입력 상태 ---
  const [guriPurchasePrice, setGuriPurchasePrice] = useState<number>(450000000); // 분양가/분담금 4억 5천
  const [guriCompletionMonths, setGuriCompletionMonths] = useState<number>(7); // 완공까지 남은 기간(개월)
  const [guriSize, setGuriSize] = useState<"under" | "over">("under"); // 전용면적 85㎡ 이하/초과
  const [guriSellPrice, setGuriSellPrice] = useState<number>(650000000); // 완공 후 매도가 6억 5천
  const [guriLegalFee, setGuriLegalFee] = useState<number>(1000000); // 법무사/등기법인 대행료
  const [guriLoanInterest, setGuriLoanInterest] = useState<number>(15000000); // 중도금 대출 이자 (기본 1500만 원)
  const [guriOptionCost, setGuriOptionCost] = useState<number>(20000000); // 기타 옵션 및 학교용지부담금 등 (기본 2000만 원)
  const [guriBrokerageRate, setGuriBrokerageRate] = useState<number>(0.4); // 구리 중개수수료율 (%)
  const [isAutoGuriBrokerage, setIsAutoGuriBrokerage] = useState<boolean>(true); // 구리 중개수수료 자동 계산 여부
  const [isAutoLegalFee, setIsAutoLegalFee] = useState<boolean>(true); // 법무사 비용 자동 계산 여부
  const [isGuriRegulated, setIsGuriRegulated] = useState<boolean>(true); // 구리시 조정대상지역 여부 (기본 true)

  // 구리 분양가(매매가격)에 따른 법무사 비용 자동 계산
  useEffect(() => {
    if (isAutoLegalFee) {
      setGuriLegalFee(calculateLegalFee(guriPurchasePrice));
    }
  }, [guriPurchasePrice, isAutoLegalFee]);

  // 중개수수료 자동 요율 업데이트
  useEffect(() => {
    if (isAutoSiheungBrokerage) {
      setSiheungBrokerageRate(calculateBrokerageFee(siheungSellPrice).rate);
    }
  }, [siheungSellPrice, isAutoSiheungBrokerage]);

  useEffect(() => {
    if (isAutoGuriBrokerage) {
      setGuriBrokerageRate(calculateBrokerageFee(guriSellPrice).rate);
    }
  }, [guriSellPrice, isAutoGuriBrokerage]);

  // --- 결과 계산 상태 ---
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    // 1. 시흥 아파트 매도 시 요건 분석
    const totalSiheungHoldAtSale = siheungHoldMonths + guriCompletionMonths; // 완공 시점의 시흥 거주 기간
    // 일시적 2주택 요건 검토: 
    // - 시흥 주택 취득 후 1년 이상 경과 후 구리 아파트 취득(완공)해야 함
    const isOverOneYearGap = totalSiheungHoldAtSale >= 12; 
    
    // 시흥 아파트 매도 시 중개수수료 계산
    const siheungBrokerageFeeValue = Math.floor(siheungSellPrice * (siheungBrokerageRate / 100));
    
    // 시흥 아파트 양도 차익
    const siheungGain = Math.max(0, siheungSellPrice - siheungPurchasePrice);
    
    // 일시적 2주택 양도세 비과세 여부 (3년 이내 매도 & 보유 2년 이상인 경우 비과세)
    let siheungTransferTax = 0;
    if (!isOverOneYearGap) {
      // 1년 시차 미충족 시 일반 과세 (간이 계산: 약 20% 평균 세율 적용)
      siheungTransferTax = Math.floor(siheungGain * 0.22);
    } else if (siheungSellPrice > 1200000000) {
      // 12억 초과분에 대해 과세
      const taxableRatio = (siheungSellPrice - 1200000000) / siheungSellPrice;
      const taxableGain = siheungGain * taxableRatio;
      siheungTransferTax = Math.floor(taxableGain * 0.35); // 간이 계산세율 35%
    }

    // 시흥 매도 시 총 비용
    const option1TotalCost = siheungBrokerageFeeValue + siheungTransferTax + siheungMovingCost;
    // 시흥 매도 후 순수익
    const option1NetProceeds = siheungSellPrice - option1TotalCost;

    // 구리 아파트 원시 취득세 계산 (지주택 완공 후 보존등기)
    const guriAcquisitionTaxRate = guriSize === "under" ? 0.0296 : 0.0316;
    const guriAcquisitionTax = Math.floor(guriPurchasePrice * guriAcquisitionTaxRate);

    // ----------------------------------------------------
    // 선택지 2: 구리 아파트 완공 후 매도 시 (시흥 아파트 유지)
    // ----------------------------------------------------
    const guriTotalAcquisitionCost = guriPurchasePrice + guriAcquisitionTax + guriLegalFee + guriLoanInterest + guriOptionCost;
    const guriGain = Math.max(0, guriSellPrice - guriTotalAcquisitionCost);
    const guriTransferTax77 = Math.floor(guriGain * 0.77);
    const guriTransferTax66 = Math.floor(guriGain * 0.66);
    
    // 전세 2년 임대 후 매도 시:
    // 1. 일반과세 기본세율 적용 (일시적 다주택 중과 유예 또는 비규제지역 시)
    const guriTransferTaxProgressive = calculateProgressiveTax(guriGain);
    
    // 2. 조정대상지역 2주택 중과세율 적용 (기본세율 + 20%p 가산)
    const guriTransferTaxHeavy = calculateHeavyTax2Houses(guriGain);
    
    // 구리 아파트 매도 시 중개수수료 계산
    const guriBrokerageFeeValue = Math.floor(guriSellPrice * (guriBrokerageRate / 100));

    // 구리 매도 시 총 비용 (1년 이내 매도 기준)
    const option2TotalCost = guriAcquisitionTax + guriLegalFee + guriLoanInterest + guriOptionCost + guriTransferTax77 + guriBrokerageFeeValue;
    // 구리 매도 후 순수익 (1년 이내 매도)
    const option2NetGain = guriGain - guriTransferTax77 - guriBrokerageFeeValue;

    // 구리 전세 2년 후 매도 시 총 비용 및 순수익 (중과 유예/비조정 가정)
    const option3TotalCost = guriAcquisitionTax + guriLegalFee + guriLoanInterest + guriOptionCost + guriTransferTaxProgressive + guriBrokerageFeeValue;
    const option3NetGain = guriGain - guriTransferTaxProgressive - guriBrokerageFeeValue;

    // 구리 전세 2년 후 매도 시 총 비용 및 순수익 (조정대상지역 중과 적용 가정)
    const option3HeavyTotalCost = guriAcquisitionTax + guriLegalFee + guriLoanInterest + guriOptionCost + guriTransferTaxHeavy + guriBrokerageFeeValue;
    const option3HeavyNetGain = guriGain - guriTransferTaxHeavy - guriBrokerageFeeValue;

    setResults({
      isOverOneYearGap,
      totalSiheungHoldAtSale,
      siheungBrokerage: siheungBrokerageFeeValue,
      siheungBrokerageRate,
      siheungTransferTax,
      siheungGain,
      option1TotalCost,
      option1NetProceeds,
      guriAcquisitionTax,
      guriAcquisitionTaxRate: guriAcquisitionTaxRate * 100,
      guriGain,
      guriTransferTax77,
      guriTransferTax66,
      guriTransferTaxProgressive,
      guriTransferTaxHeavy,
      guriBrokerage: guriBrokerageFeeValue,
      guriBrokerageRate,
      option2TotalCost,
      option2NetGain,
      option3TotalCost,
      option3NetGain,
      option3HeavyTotalCost,
      option3HeavyNetGain,
    });
  }, [
    siheungPurchasePrice,
    siheungSellPrice,
    siheungHoldMonths,
    siheungMovingCost,
    guriPurchasePrice,
    guriCompletionMonths,
    guriSize,
    guriSellPrice,
    guriLegalFee,
    guriLoanInterest,
    guriOptionCost,
    isGuriRegulated,
  ]);

  return (
    <div className="min-h-screen bg-[#0b0b12] text-gray-100 py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* 상단 헤더 */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold mb-4 transition">
            ← 무림북 홈으로 가기
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-orange-500 mb-3 font-serif">
            일시적 2주택 vs 지주택 완공 후 매도 세금 비교 계산기
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            시흥 아파트(기존 보유)를 팔아 일시적 2주택 비과세 혜택을 받을 때와, 구리 지주택 아파트(신규 취득)를 완공 후 바로 매도할 때의 세금과 제반 비용을 비교 계산해 드립니다.
          </p>
        </div>

        {/* 2단 그리드 입력 폼 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* A. 시흥 아파트 정보 (기존 보유) */}
          <div className="bg-[#131320] border border-gray-800/80 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-amber-400 mb-5 flex items-center gap-2 border-b border-gray-800 pb-3">
              <span className="flex items-center justify-center w-7 h-7 bg-amber-400/10 rounded-lg text-amber-400 text-sm">A</span>
              시흥 아파트 (기존 보유 주택)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">최초 취득 가격 (구입가)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={siheungPurchasePrice}
                    onChange={(e) => setSiheungPurchasePrice(Number(e.target.value))}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">{formatKrwEok(siheungPurchasePrice)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">예상 매도 가격 (판매가)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={siheungSellPrice}
                    onChange={(e) => setSiheungSellPrice(Number(e.target.value))}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">{formatKrwEok(siheungSellPrice)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">현재 거주/보유 기간</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={siheungHoldMonths}
                      onChange={(e) => setSiheungHoldMonths(Number(e.target.value))}
                      className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 transition"
                    />
                    <span className="absolute right-4 top-3.5 text-gray-500 text-sm">개월</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">예상 이사 비용</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={siheungMovingCost}
                      onChange={(e) => setSiheungMovingCost(Number(e.target.value))}
                      className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 transition"
                    />
                    <span className="absolute right-4 top-3.5 text-gray-500 text-sm">원</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">부동산 중개수수료율 (%)</label>
                  <label className="flex items-center gap-1 text-xs text-amber-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoSiheungBrokerage}
                      onChange={(e) => setIsAutoSiheungBrokerage(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>법정 요율 자동 적용</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={siheungBrokerageRate}
                    onChange={(e) => {
                      setIsAutoSiheungBrokerage(false);
                      setSiheungBrokerageRate(Number(e.target.value));
                    }}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* B. 구리시 지역주택조합 아파트 정보 (신축 예정) */}
          {/* B. 구리시 지역주택조합 아파트 정보 (신축 취득) */}
          <div className="bg-[#131320] border border-gray-800/80 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-rose-500 mb-5 flex items-center gap-2 border-b border-gray-800 pb-3">
              <span className="flex items-center justify-center w-7 h-7 bg-rose-500/10 rounded-lg text-rose-400 text-sm">B</span>
              구리시 지역주택조합 아파트 (신축 취득)
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-[#1b1b2f] p-3 rounded-xl border border-gray-800">
                <span className="text-sm font-semibold text-gray-300">구리시 규제 지역 여부</span>
                <label className="flex items-center gap-1.5 text-xs text-rose-400 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={isGuriRegulated}
                    onChange={(e) => setIsGuriRegulated(e.target.checked)}
                    className="accent-rose-500 w-4 h-4 rounded"
                  />
                  <span>조정대상지역 지정</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">예상 분양가 (조합원 분담금 총액)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={guriPurchasePrice}
                    onChange={(e) => setGuriPurchasePrice(Number(e.target.value))}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">{formatKrwEok(guriPurchasePrice)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">완공 후 예상 매도 시세</label>
                <div className="relative">
                  <input
                    type="number"
                    value={guriSellPrice}
                    onChange={(e) => setGuriSellPrice(Number(e.target.value))}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">{formatKrwEok(guriSellPrice)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">완공까지 남은 기간</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={guriCompletionMonths}
                      onChange={(e) => setGuriCompletionMonths(Number(e.target.value))}
                      className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition"
                    />
                    <span className="absolute right-4 top-3.5 text-gray-500 text-sm">개월</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">전용 면적 설정</label>
                  <div className="grid grid-cols-2 gap-2 h-[50px]">
                    <button
                      type="button"
                      onClick={() => setGuriSize("under")}
                      className={`rounded-xl text-xs font-bold transition border ${
                        guriSize === "under"
                          ? "bg-rose-500/20 border-rose-500 text-rose-400"
                          : "bg-[#1b1b2f] border-gray-700/60 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      85㎡ 이하 (취득세 2.96%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuriSize("over")}
                      className={`rounded-xl text-xs font-bold transition border ${
                        guriSize === "over"
                          ? "bg-rose-500/20 border-rose-500 text-rose-400"
                          : "bg-[#1b1b2f] border-gray-700/60 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      85㎡ 초과 (취득세 3.16%)
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">기타 법무사 및 등기 비용</label>
                  <label className="flex items-center gap-1 text-xs text-rose-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoLegalFee}
                      onChange={(e) => setIsAutoLegalFee(e.target.checked)}
                      className="accent-rose-500 rounded"
                    />
                    <span>자동 계산</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={guriLegalFee}
                    onChange={(e) => {
                      setIsAutoLegalFee(false);
                      setGuriLegalFee(Number(e.target.value));
                    }}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">{formatKrwEok(guriLegalFee)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">중도금 대출 이자 (후불제 등)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={guriLoanInterest}
                    onChange={(e) => setGuriLoanInterest(Number(e.target.value))}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">{formatKrwEok(guriLoanInterest)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">기타 옵션비 및 대관청 비용 (학교용지부담금 등)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={guriOptionCost}
                    onChange={(e) => setGuriOptionCost(Number(e.target.value))}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">{formatKrwEok(guriOptionCost)}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">부동산 중개수수료율 (%)</label>
                  <label className="flex items-center gap-1 text-xs text-rose-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoGuriBrokerage}
                      onChange={(e) => setIsAutoGuriBrokerage(e.target.checked)}
                      className="accent-rose-500 rounded"
                    />
                    <span>법정 요율 자동 적용</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={guriBrokerageRate}
                    onChange={(e) => {
                      setIsAutoGuriBrokerage(false);
                      setGuriBrokerageRate(Number(e.target.value));
                    }}
                    className="w-full bg-[#1b1b2f] border border-gray-700/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition"
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 결과 비교 카드 영역 */}
        {results && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
            {/* 결과 1: 시흥 아파트 매도 시 */}
            <div className="bg-gradient-to-b from-[#161f2f] to-[#121722] border border-blue-900/40 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-blue-900/30">
                <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                  🛡️ 시나리오 1: 시흥 아파트 매도
                </h3>
                <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full font-bold">
                  일시적 2주택 비과세 활용
                </span>
              </div>

              {/* 적격성 확인 알림 */}
              <div className={`p-4 rounded-xl mb-6 text-sm ${
                results.isOverOneYearGap 
                  ? "bg-[#0b2b1a] border border-[#145330] text-emerald-300"
                  : "bg-[#3b2314] border border-[#6b3a1a] text-amber-300"
              }`}>
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  {results.isOverOneYearGap ? "✓ 일시적 2주택 요건 충족 가능" : "⚠️ 시차 조건 주의 필요"}
                </div>
                <p className="text-xs leading-relaxed text-gray-300">
                  {results.isOverOneYearGap 
                    ? `시흥 주택 취득 후 완공까지 ${results.totalSiheungHoldAtSale}개월이 경과하여 '1년 이상 시차 후 신규 취득' 조건을 충족합니다. 완공 후 3년 안에 시흥 집을 팔면 양도소득세 비과세 혜택을 받습니다.`
                    : `현재 기준 완공 시점까지의 보유 기간이 ${results.totalSiheungHoldAtSale}개월입니다. 일시적 2주택 비과세를 받으려면 종전 주택 취득 후 최소 1년(12개월) 뒤 신규 주택을 취득해야 하므로 시흥 아파트 취득일과 구리 완공일 간의 간격을 반드시 재확인하십시오.`}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">시흥 아파트 매도 금액</span>
                  <span className="font-semibold text-white">{formatKrw(siheungSellPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">양도소득세 (비과세 혜택 적용)</span>
                  <span className={`font-semibold ${results.siheungTransferTax > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {results.siheungTransferTax > 0 ? `약 ${formatKrw(results.siheungTransferTax)} (12억 초과분)` : "비과세 (0원)"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">부동산 중개수수료 ({results.siheungBrokerageRate.toFixed(1)}%)</span>
                  <span className="font-semibold text-white">{formatKrw(results.siheungBrokerage)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">이사 비용 (실비)</span>
                  <span className="font-semibold text-white">{formatKrw(siheungMovingCost)}</span>
                </div>

                <div className="pt-4 border-t border-gray-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-bold">매도 시 총 발생 비용</span>
                    <span className="text-rose-400 font-bold">{formatKrw(results.option1TotalCost)}</span>
                  </div>
                </div>

                {/* 지주택 잔금 및 보존등기 취득세 별도 표시 */}
                <div className="bg-[#0f1422] p-4 rounded-xl mt-4 border border-blue-950/60">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">구리 지주택 완공 취득 비용 (별도 부담)</h4>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-gray-400">원시취득세 건물분 ({results.guriAcquisitionTaxRate.toFixed(2)}%)</span>
                    <span className="font-semibold text-white">{formatKrw(results.guriAcquisitionTax)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-gray-400">기타 등기 법무사 비용</span>
                    <span className="font-semibold text-white">{formatKrw(guriLegalFee)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-gray-400">중도금 대출 이자</span>
                    <span className="font-semibold text-white">{formatKrw(guriLoanInterest)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-gray-400">옵션비 및 추가 분담금</span>
                    <span className="font-semibold text-white">{formatKrw(guriOptionCost)}</span>
                  </div>
                </div>

                <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-900/30 text-center mt-6">
                  <div className="text-xs text-gray-400 mb-1">시흥 아파트 매도 후 내 손에 쥐는 현금</div>
                  <div className="text-2xl font-extrabold text-blue-400">
                    {formatKrw(results.option1NetProceeds)}
                  </div>
                </div>
              </div>
            </div>

            {/* 결과 2: 구리 지주택 완공 후 매도 시 */}
            <div className="bg-gradient-to-b from-[#24171e] to-[#171014] border border-rose-950/40 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-rose-950/30">
                <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                  🔥 시나리오 2: 구리 아파트 완공 후 매도
                </h3>
                <span className="bg-rose-500/10 text-rose-400 text-xs px-2.5 py-1 rounded-full font-bold">
                  시흥 아파트 보유 유지 (다주택)
                </span>
              </div>

              {/* 중과세 경고 */}
              <div className="p-4 rounded-xl mb-6 text-sm bg-[#380e15] border border-[#6b1424] text-rose-300">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  ⚠️ 단기 양도소득세 77% 적용 대상
                </div>
                <p className="text-xs leading-relaxed text-gray-300">
                  기존 시흥 아파트를 남겨둔 채 구리 완공 주택을 취득일로부터 1년 이내에 매도하면 단기 양도세율 **77%(지방소득세 포함)**가 중과세됩니다. 1년 이상 2년 미만 보유 시에도 **66%**의 고율의 세율이 적용됩니다.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">구리 완공 아파트 예상 매도가</span>
                  <span className="font-semibold text-white">{formatKrw(guriSellPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">구리 아파트 취득세 (보존등기 {results.guriAcquisitionTaxRate.toFixed(2)}%)</span>
                  <span className="font-semibold text-white">{formatKrw(results.guriAcquisitionTax)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">등기 법무사 비용</span>
                  <span className="font-semibold text-white">{formatKrw(guriLegalFee)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">중도금 대출 이자</span>
                  <span className="font-semibold text-white">{formatKrw(guriLoanInterest)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">옵션비 및 추가 분담금</span>
                  <span className="font-semibold text-white">{formatKrw(guriOptionCost)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">양도소득세 중과세 (1년 이내 매도 77%)</span>
                  <span className="font-semibold text-rose-400">{formatKrw(results.guriTransferTax77)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">양도소득세 중과세 (1년~2년 사이 매도 66%)</span>
                  <span className="font-semibold text-orange-400">{formatKrw(results.guriTransferTax66)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">부동산 중개수수료 ({results.guriBrokerageRate.toFixed(1)}%)</span>
                  <span className="font-semibold text-white">{formatKrw(results.guriBrokerage)}</span>
                </div>

                <div className="pt-4 border-t border-gray-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-bold">매도 시 총 발생 비용 (77% 기준)</span>
                    <span className="text-rose-400 font-bold">{formatKrw(results.option2TotalCost)}</span>
                  </div>
                </div>

                <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-900/30 text-center mt-6">
                  <div className="text-xs text-gray-400 mb-1">양도세 77% 납부 후 순 이익금 (프리미엄 세후 차익)</div>
                  <div className="text-2xl font-extrabold text-rose-400">
                    {formatKrw(results.option2NetGain)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    (1~2년 내 매도 시 세후 차익: {formatKrw(results.guriGain - results.guriTransferTax66 - results.guriBrokerage)})
                  </div>
                </div>
              </div>
            </div>

            {/* 결과 3: 구리 아파트 전세 2년 후 매도 시 */}
            <div className="bg-gradient-to-b from-[#18271e] to-[#111c15] border border-emerald-950/40 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-emerald-950/30">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  🍀 시나리오 3: 구리 아파트 전세 2년 후 매도
                </h3>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold">
                  시흥 아파트 유지 (임대 전환)
                </span>
              </div>

              {/* 규제지역 상태 알림 */}
              <div className={`p-4 rounded-xl mb-6 text-sm ${
                isGuriRegulated 
                  ? "bg-rose-950/40 border border-rose-800/40 text-rose-300"
                  : "bg-[#0b2b1a] border border-[#145330] text-emerald-300"
              }`}>
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  {isGuriRegulated ? "⚠️ 조정대상지역 규제 적용 중" : "✓ 비규제지역 표준 세율 적용"}
                </div>
                <p className="text-xs leading-relaxed text-gray-300">
                  {isGuriRegulated 
                    ? "구리시가 조정대상지역으로 지정되어 다주택자(2주택) 매도 시 양도세 중과세율(기본세율 + 20%p)이 적용될 수 있습니다. 다만, 현재 시행 중인 다주택자 중과 한시적 배제(유예) 조치가 적용되는 기간 내 매도하면 일반세율로 세금이 감면됩니다."
                    : "비규제지역 상태로 2년 보유 완료 후 매도 시 다주택 여부와 관계없이 기본 일반세율(6%~45% 누진세율)이 정상 적용됩니다."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">구리 완공 아파트 예상 매도가</span>
                  <span className="font-semibold text-white">{formatKrw(guriSellPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">구리 아파트 취득세 (보존등기 {results.guriAcquisitionTaxRate.toFixed(2)}%)</span>
                  <span className="font-semibold text-white">{formatKrw(results.guriAcquisitionTax)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">등기 법무사 비용</span>
                  <span className="font-semibold text-white">{formatKrw(guriLegalFee)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">중도금 대출 이자</span>
                  <span className="font-semibold text-white">{formatKrw(guriLoanInterest)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">옵션비 및 추가 분담금</span>
                  <span className="font-semibold text-white">{formatKrw(guriOptionCost)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-400">부동산 중개수수료 ({results.guriBrokerageRate.toFixed(1)}%)</span>
                  <span className="font-semibold text-white">{formatKrw(results.guriBrokerage)}</span>
                </div>

                {/* 1. 중과세 유예 적용 시 (일반과세) */}
                <div className="bg-[#0b2b1a]/30 p-4 rounded-xl border border-emerald-900/30">
                  <h4 className="text-xs font-bold text-[#4ade80] uppercase tracking-wider mb-2">경로 A: 다주택 중과 유예(배제) 시</h4>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-gray-400">일반 누진 양도세</span>
                    <span className="font-semibold text-emerald-400">{formatKrw(results.guriTransferTaxProgressive)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 pt-2 border-t border-emerald-950 mt-1">
                    <span className="text-gray-300 font-bold">세후 순 이익금</span>
                    <span className="font-extrabold text-emerald-400 text-sm">{formatKrw(results.option3NetGain)}</span>
                  </div>
                </div>

                {/* 2. 중과세 부활/적용 시 (조정대상지역 패널티) */}
                {isGuriRegulated && (
                  <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-900/20">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">경로 B: 2주택 중과세 적용 시 (+20%p 중과)</h4>
                    <div className="flex justify-between items-center text-xs py-1">
                      <span className="text-gray-400">2주택 중과 양도세</span>
                      <span className="font-semibold text-rose-400">{formatKrw(results.guriTransferTaxHeavy)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1 pt-2 border-t border-rose-950/40 mt-1">
                      <span className="text-gray-300 font-bold">세후 순 이익금</span>
                      <span className="font-extrabold text-rose-400 text-sm">{formatKrw(results.option3HeavyNetGain)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 지주택 및 부동산 세법 안내 가이드 */}
        <div className="bg-[#131320] border border-gray-800 rounded-2xl p-6 shadow-xl mb-10">
          <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400 mb-4 font-serif">
            💡 알아두어야 할 지역주택조합 법적/세무 상식
          </h3>
          <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
            <div className="p-3 bg-[#1b1b2f] rounded-xl border border-gray-800">
              <span className="font-bold text-amber-400 block mb-1">1. 건물분 원시취득세 (보존등기)</span>
              지역주택조합 아파트가 준공되면 조합원은 본인 이름으로 소유권 보존등기를 진행합니다. 이때 건물 부분에 대해서는 원시취득으로 보아 주택 수와 무관하게 **2.8%의 원시취득세율**이 기본 적용되며, 지방교육세 및 농어촌특별세 포함 시 전용 85㎡ 이하는 **2.96%**, 초과는 **3.16%**가 세금으로 부과됩니다.
            </div>
            <div className="p-3 bg-[#1b1b2f] rounded-xl border border-gray-800">
              <span className="font-bold text-amber-400 block mb-1">2. 일시적 2주택 비과세 요건</span>
              기존 주택(시흥) 취득 후 최소 1년 이상 경과한 뒤 신축 아파트(구리 지주택)를 취득(사용승인일 또는 실제 입주일 중 빠른 날)해야 합니다. 그리고 신축 아파트 취득일로부터 **3년 이내**에 기존 시흥 아파트를 팔아야 1세대 1주택 비과세 혜택(양도일 현재 2년 이상 보유 충족 필요)을 적용받을 수 있습니다.
            </div>
            <div className="p-3 bg-[#1b1b2f] rounded-xl border border-gray-800">
              <span className="font-bold text-amber-400 block mb-1">3. 단기 양도소득세 중과</span>
              만약 기존 주택을 처분하지 않고 새로 분양받은 구리시 아파트를 등기 후 곧바로 매도(1년 미만 보유)할 경우, 양도차익의 **70%(지방소득세 포함 77%)**를 양도소득세로 납부해야 합니다. 보유 기간이 1년 이상 2년 미만인 경우에도 **60%(지방소득세 포함 66%)**의 세율이 적용되므로 세후 이익을 면밀히 분석해야 합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
