# -*- coding: utf-8 -*-
"""
워드프레스 IRP 포스트(ID: 837)의 본문 최상단에 앵커 태그로 점프 연동되는 예쁜 HTML 목차(Table of Contents) 영역을 삽입하는 업데이트 스크립트
"""

import requests

def inject_table_of_contents():
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    post_id = 837
    wp_sub_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/irp_sub.jpg"

    # 본문 최상단에 HTML/CSS 스타일 목차 삽입 및 각 헤더(h3)에 id 앵커 연동
    toc_html = """
<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin: 24px 0 32px 0;">
  <p style="font-weight: 900; margin-top: 0; margin-bottom: 12px; font-size: 17px; color: #ff2a5f; display: flex; align-items: center; gap: 8px;">
    <span>📌</span> 이 글의 목차 (빠른 이동)
  </p>
  <ul style="list-style-type: none; padding-left: 0; margin: 0; line-height: 1.8; font-size: 15px;">
    <li style="margin-bottom: 6px;"><a href="#section1" style="color: #2980b9; text-decoration: underline; font-weight: 700;">1. 개인형 IRP 중도해지 시 발생하는 세금 페널티의 실체</a></li>
    <li style="margin-bottom: 6px;"><a href="#section2" style="color: #2980b9; text-decoration: underline; font-weight: 700;">2. 16.5% 기타소득세를 3.3%~5.5% 연금소득세로 낮추는 5가지 합법적 사유</a></li>
    <li style="margin-bottom: 6px;"><a href="#section3" style="color: #2980b9; text-decoration: underline; font-weight: 700;">3. 원금을 지키면서 자금을 확보하는 2대 실무 우회 프로세스</a></li>
    <li style="margin-bottom: 6px;"><a href="#section4" style="color: #2980b9; text-decoration: underline; font-weight: 700;">4. 가장 자주 묻는 질문(FAQ)과 실무 답변 리스트</a></li>
    <li style="margin-bottom: 6px;"><a href="#section5" style="color: #2980b9; text-decoration: underline; font-weight: 700;">5. 개인형 IRP와 연금저축펀드/연금저축보험의 근본적 차이점 비교</a></li>
    <li style="margin-bottom: 6px;"><a href="#section6" style="color: #2980b9; text-decoration: underline; font-weight: 700;">6. 금융회사 간 계좌 이관(이체) 제도를 통한 수수료 절감 요령</a></li>
    <li style="margin-bottom: 6px;"><a href="#section7" style="color: #2980b9; text-decoration: underline; font-weight: 700;">7. 퇴직금 수령 시 IRP 연계 30%~40% 퇴직소득세 감면 원리</a></li>
    <li style="margin-bottom: 6px;"><a href="#section8" style="color: #2980b9; text-decoration: underline; font-weight: 700;">8. 연금 수령 한도 초과 시 종합소득세 과세 및 피하는 분리과세 신청법</a></li>
  </ul>
</div>
"""

    content_with_toc = f"""
<p>이 글에서는 연말정산 세액공제를 위해 가입했다가 급전이 필요해 깨려고 고민하시는 <strong>개인형 IRP 중도해지</strong> 시의 부득이한 세금 불이익 페널티를 완벽히 피하고 자금 손실을 최소화하는 3가지 실전 우회 방법에 대해 면밀히 살펴보겠습니다. 은퇴 후 안정적인 노후 보장을 위해 국가가 세제 혜택을 몰아주는 퇴직연금 계좌이지만, <strong>개인형 IRP 중도해지</strong> 시점에 닥쳐오는 원천징수 폭탄은 많은 이들의 발목을 잡는 최대 변수입니다. 🌸</p>

{toc_html}

<hr />

<h3 id="section1">📢 1. 개인형 IRP 중도해지 시 발생하는 무서운 세금 페널티의 실체</h3>
<p>가장 먼저 파악해야 할 팩트는 중도 인출이나 해지를 단행할 때 발생하는 기타소득세 징수 세율의 무서움입니다. 연말정산이나 종합소득세 신고 시 세액공제를 받았던 납입 원금과 계좌 운용을 통해 불려 나간 이자 및 배당소득 등 전체 적립금에 대해 무려 16.5%의 기타소득세가 지방소득세를 포함하여 세전 일괄 원천징수 처리됩니다.</p>

<p>예를 들어, 내가 1,000만 원을 납입하여 매년 13.2% 또는 16.5%의 세액공제 혜택을 보았더라도, <strong>개인형 IRP 중도해지</strong>를 거치게 되면 이자 소득세의 통상 세율인 15.4%보다 높은 16.5%를 떼이게 되므로 사실상 원금 손실을 감수해야 합니다. 특히 소득공제를 아예 신청하지 않았거나 세액공제 한도(연 900만 원)를 초과하여 입금한 금액이 섞여 있다면, 이 부분은 세금 부과 대상에서 제외되어야 마땅함에도 불구하고 서류 미비로 이중 과세되는 억울한 사태를 겪게 되는 경우가 빈번합니다. 따라서 <strong>개인형 IRP 중도해지</strong> 전 홈택스를 통해 내 과거 연도별 납입 증명서 and 공제받지 않은 금액 증명서를 꼼꼼하게 교차 대조해 보셔야 안전합니다.</p>

<div style="text-align: center; margin: 25px 0;">
  <img src="{wp_sub_url}" alt="세금 절세를 계획하는 저축 서류와 돼지저금통" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">[참고 이미지] 노후 자산 관리의 안정적인 은퇴 설계를 나타내는 저축 서식 이미지</p>
</div>

<hr />

<h3 id="section2">💰 2. 16.5% 기타소득세를 3.3%~5.5% 연금소득세로 낮추는 5가지 합법적 사유</h3>
<p>세법에서는 개인의 불가피한 경제적 조난이나 파산 상황으로 인해 <strong>개인형 IRP 중도해지</strong>를 단행할 수밖에 없는 사유에 대해서는 특별 제도를 두어 세금 부담을 정상적인 연금 수령 수준(3.3%~5.5%)으로 낮춰 줍니다.</p>

<ul>
  <li><strong>개인 회생 및 파산 선고</strong>: 법원으로부터 공식 회생 결정 또는 파산 선고를 받은 자는 결정서 정본을 제출하면 합법적으로 낮은 연금소득세만 부과됩니다.</li>
  <li><strong>3개월 이상의 장기 요양</strong>: 가입자 본인이나 배우자, 혹은 주민등록상 부양가족이 질병이나 부상으로 인해 3개월 이상 요양이 필요한 경우, 그 요양 비용 한도 내에서 인출이 가능합니다. 🏥</li>
  <li><strong>천재지변 및 사망·해외 이주</strong>: 태풍, 지진 등의 천재지변 피해를 입거나, 이민으로 인해 해외로 영주 이주를 하게 되는 경우 이주 신고서 등을 증빙으로 제출하면 공제 우대를 적용받습니다.</li>
  <li><strong>금융회사 영업정지 및 파산</strong>: 계좌를 개설한 저축은행이나 증권사가 파산하는 등 본인 귀책이 없는 경우에도 감면 혜택 대상이 됩니다.</li>
</ul>

<hr />

<h3 id="section3">🛠️ 3. 원금을 지키면서 자금을 확보하는 2대 실무 우회 프로세스</h3>
<p>부담스러운 세금 폭탄을 피해 가며 <strong>개인형 IRP 중도해지</strong>를 하지 않고 적립금을 유지한 채 급전을 마련하는 대표적 우회 경로도 존재합니다.</p>
<ol>
  <li><strong>연금 담보 대출 실행</strong>: 계좌를 해지하는 극단적인 선택 대신, 적립된 평가 금액의 최대 50%~60% 범위 안에서 저금리로 긴급 비상금 담보 자금을 실행받습니다. 이 경우 노후 비과세 적립 혜택은 100% 온전하게 지키면서 당장의 자금 유동성 위기를 현명하게 극복할 수 있습니다.</li>
  <li><strong>초과 납입금 분리 인출</strong>: 세액공제를 받지 않은 한도 초과분 금액(예: 연 900만 원 초과분)이 계좌에 들어있다면, 이 부분은 페널티 없이 언제든 자유롭게 인출할 수 있습니다. 은행 방문 전에 세무서에서 '연금보험료 등 소득·세액 공제확인서'를 떼어 제출하시면 해당 금액만 세금 없이 깔끔하게 찾아 쓸 수 있습니다. 🚀</li>
</ol>

<hr />

<h3 id="section4">❓ 4. 가장 자주 묻는 질문(FAQ)과 실무 답변 리스트</h3>
<p><strong>Q1. 세액공제를 아예 안 받은 자금도 중도인출 시 세금이 부과되나요?</strong><br>
A. 아닙니다. 세액공제 혜택을 전혀 받지 않은 순수 원금(비과세 자금)에 대해서는 <strong>개인형 IRP 중도해지</strong>나 인출 시 단 1원도 과세되지 않습니다. 국세청 확인서만 발급받아 은행에 넘겨주시면 세금 없이 인출 가능합니다.</p>

<p><strong>Q2. 담보대출을 받을 때 금리 조건과 대출 한도는 어떻게 결정되나요?</strong><br>
A. 대다수 시중 은행 및 증권사는 가입자 적립금 평가액의 최대 50%~60% 선을 대출 한도로 보장하며, 금리는 통상 예적금 담보대출 기준에 맞추어 연동 가산금리(연 1.0%~1.5% 수준 가산) 방식으로 매우 저렴하게 책정됩니다.</p>

<p><strong>Q3. 사유서 및 진단서를 은행에 제출하면 바로 5.5% 세율이 적용되나요?</strong><br>
A. 네, 요건이 충족되면 즉각 연금외수령 사유로 등재되어 16.5%가 아닌 3.3%~5.5%의 저율 연금소득세만 선제 공제된 후 통장으로 안심 입금 처리됩니다.</p>

<hr />

<h3 id="section5">🛡️ 5. 개인형 IRP와 연금저축펀드/연금저축보험의 근본적 차이점 비교</h3>
<p>많은 가입자들이 개인형 IRP와 연금저축을 혼동하여 중도해지 시 동일한 불이익을 겪는 줄 오해합니다. 하지만 이 두 계좌는 중도 인출의 가능 여부와 세법적 페널티 조건에서 매우 큰 차이를 보입니다.</p>
<p>연금저축계좌의 경우, 특별한 사유서 제출 없이도 언제든 적립금의 일부를 중도에 부분 인출할 수 있습니다. 물론 이때도 세액공제를 받은 원금과 수익에 대해서는 16.5%의 기타소득세가 부과되지만, 전액을 깨지 않고 일부만 필요한 만큼 꺼내 쓸 수 있다는 유연함이 존재합니다.</p>
<p>반면 <strong>개인형 IRP 중도해지</strong>는 법정 예외 사유(개인회생, 파산, 3개월 이상 요양 등)를 제외하고는 **부분 인출이 원천적으로 불가능**합니다. 급전이 100만 원만 필요하더라도 계좌 전체를 깨서 전액 해지해야 하므로, 세금 손실의 규모가 상상을 초월할 정도로 커질 수 있습니다. 이러한 계좌 고유의 성격을 명확히 이해하고, 장기 적립이 곤란한 자금은 연금저축으로 우선 납입 비중을 배분하는 포트폴리오 다변화 재테크 전략이 요구됩니다.</p>

<hr />

<h3 id="section6">🏛️ 6. 금융회사 간 계좌 이관(이체) 제도를 통한 수수료 절감 요령</h3>
<p>만약 내가 가입한 은행의 IRP 계좌 수수료가 매년 적립금의 0.2%~0.4%씩 꼬박꼬박 빠져나가 장기 수익률을 깎아먹고 있다면, 해지가 아닌 **'계좌 이관(이체)'** 제도를 적극적으로 고려해 보아야 합니다.</p>
<p>계좌 이관은 기존 적립금과 세액공제 혜택을 100% 그대로 유지한 채, 수수료가 전액 면제되는 증권사(다이렉트 비대면 IRP 계좌 등)로 금융회사만 변경하는 합법적 절차입니다. 이 제도를 활용하면 <strong>개인형 IRP 중도해지</strong>에 따른 16.5% 세금 추징 없이도 금융 비용 지출을 제로로 만들어 연금의 실질 운용 수익률을 대폭 끌어올릴 수 있습니다. 이체 신청은 신규로 가입하고자 하는 증권사 앱을 통해 스마트폰 비대면으로 간편하게 신청 가능하므로 불필요하게 은행 창구에 방문하여 해지 상담을 진행하지 않으셔도 됩니다.</p>

<hr />

<h3 id="section7">📈 7. 퇴직금 수령 시 IRP 연계 30%~40% 퇴직소득세 감면 원리</h3>
<p>회사를 퇴직하면서 받는 퇴직금을 개인형 IRP 계좌로 이체하여 수령하게 되면, 일시에 떼이는 퇴직소득세를 뒤로 미루는 **'과세이연'** 효과가 작동합니다.</p>
<p>더불어, 이 이체된 퇴직금을 연금 형태로 분할 수령하기 시작하면, 내야 할 원래의 퇴직소득세 금액에서 **최초 10년 동안은 30%를 감면**해 주며, **11년 차 수령 분부터는 무려 40%의 세금을 감면**하여 적용해 줍니다. 일시금으로 찾으면 100% 부과될 아까운 세금을 연금 수령을 통해 최대 40%나 절약할 수 있는 셈입니다. 만약 급전 목적의 <strong>개인형 IRP 중도해지</strong>를 해 버리면 이 엄청난 40% 세금 감면 권한도 전부 물거품처럼 소실되고 일시금 기준의 무거운 세율로 추징당하므로, 아무리 자금 사정이 빡빡하더라도 연금 수령 개시 연령인 만 55세까지 계좌를 끝까지 보존하는 것이 최고의 절세 전략입니다.</p>

<hr />

<h3 id="section8">💼 8. 연금 수령 한도 초과 시 종합소득세 과세 및 종합과세 피하는 분리과세 신청법</h3>
<p>안전하게 연금을 수령하기 시작하더라도 연간 연금 수령액 한도를 세밀하게 계산해 두어야 세금 부담을 줄일 수 있습니다. 사적으로 납입한 연금저축과 IRP에서 나오는 연금 수령액 합계가 **연간 1,200만 원**을 초과하게 되면, 해당 금액은 사적 연금 소득 전체가 종합소득세 합산 과세 대상이 되거나, 혹은 **16.5%의 분리과세** 세율 중 하나를 택해 세금을 신고해야 합니다.</p>
<p>따라서 다달이 받는 연금액이 연 1,200만 원 이하가 되도록 수령 기간을 10년 이상 장기로 길게 늘려 분할 설계하는 것이 현명합니다. 종합과세 대상자가 될 경우 최고 49.5%의 누진 소득세율 폭탄을 맞을 수 있으므로 가입 금융기관 어플리케이션을 통해 연도별 예상 인출 한도 스케줄을 사전 조회해 보고 지급액을 철저하게 컨트롤하는 자산 배분 테크닉이 필요합니다.</p>

<hr />

<h3>🏛️ 공식 공인 신뢰 연금 포털 가이드</h3>
<ul>
  <li>👉 <strong><a href="https://www.fss.or.kr" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">금융감독원 파인 통합연금포털 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(내 가입 금융사들의 IRP 적립금 현황을 한눈에 모니터링하고 해지 세액 사전 계산을 원스톱으로 제공하는 금융 감독 기관 포털입니다.)</span></li>
</ul>

<h3>🚶‍♂️ 긴급 자금 계획 전 상환 이자를 모의 연산해 보는 팁 (내부 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://blog.murimbook.com/%eb%8c%80%ec%b6%9c-%ec%9d%b4%ec%9e%90-%ea%b3%84%ec%82%b0%ea%b8%b0-100-%eb%ac%b4%eb%a3%8c/" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">내 가게 대출 이자 상환 부담을 줄여주는 무료 대출 이자 계산기 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(IRP 해지 전, 담보 융자 실행에 따른 매월 상환 원금과 이자 금액을 원리금 균등 방식으로 즉시 정밀 계산해 주는 무림북 전용 무료 서비스입니다.)</span></li>
</ul>

<h3>🍵 돈 문제로 속 타고 답답할 때 목을 맑게 다스려주는 차 (외부 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://m.blog.naver.com/PostView.naver?blogId=murimbook&logNo=224336757499&navType=by" target="_blank" rel="noopener noreferrer" style="color: #27ae60; font-weight: bold; text-decoration: underline;">목 통증과 기침을 부드럽게 지워줄 순수한집 1+1 배도라지맥문동차 힐링 루틴 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(자금 걱정으로 마르고 칼칼해진 목 점막 수분 장벽을 편안하게 코팅해 주고 가슴 속을 차분하게 진정시켜 주는 친환경 티백 웰빙 차 가이드 정보입니다.)</span></li>
</ul>

<h3>🎧 퇴근길 지친 귓속에 나만의 힐링을 주는 아이템 (외부 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://m.blog.naver.com/PostView.naver?blogId=murimbook&logNo=224337660556&navType=by" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">귀의 피로를 사뿐히 덜어주는 필립스 TAT1109 무선이어폰 특가 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(외부 소음을 줄이고 조용히 클래식이나 오디오북 콘텐츠에 몰입할 수 있도록 돕는 인체공학적 고성능 무선 이어폰 특가 정보입니다.)</span></li>
</ul>
"""

    r = requests.post(f"{WP_URL}/wp-json/wp/v2/posts/{post_id}", auth=(WP_USER, WP_PASS), json={
        "content": content_with_toc
    })
    if r.status_code == 200:
        print("[SUCCESS] HTML Table of Contents with jump-anchors successfully injected!")
    else:
        print(f"[ERROR] Failed TOC update: {r.text}")

if __name__ == "__main__":
    inject_table_of_contents()
