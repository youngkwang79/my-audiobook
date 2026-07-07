const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let url = '';
let serviceKey = '';

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const parts = line.trim().split('=');
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim();
      if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = v;
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = v;
    }
  });
}

url = url.replace(/^['"]|['"]$/g, '');
serviceKey = serviceKey.replace(/^['"]|['"]$/g, '');

const supabase = createClient(url, serviceKey);

async function main() {
  const scheduledTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  
  const contentMarkdown = `치솟는 더위를 피해 시원한 강바람을 맞으며 밤하늘 아래에서 밤 수영을 즐길 수 있는 특별한 소식입니다! 이번 여름, 많은 분들이 고대하시던 **한강공원 야간 수영장 및 물놀이장 연장 운영**이 본격적으로 펼쳐집니다.

도심 한복판에서 대교의 밤 야경과 화려한 한강 불빛을 바라보며 시원한 물속에서 피서를 즐기는 낭만적인 밤 수영 체험 가이드를 공유해 드립니다.

### 📅 한강공원 야간 수영장 운영 핵심 스펙
올해 야간 물놀이장 운영은 더위에 지친 시민들을 위해 기존 주간 영업을 연장하는 방식으로 진행되며, 일정은 다음과 같습니다.

* **운영 기간**: **2026년 7월 3일부터 8월 30일까지**
* **야간 운영 시간**: **매일 18:00 ~ 20:00** (주간 가동에 이어 2시간 연장)
* **개장 장소**: **뚝섬 한강공원, 여의도 한강공원 수영장** 및 **잠실, 난지 한강공원 물놀이장**

> [!IMPORTANT]
> 야간 연장 개장 시간은 강우량이나 배수 상황 등의 기상 상황에 따라 탄력적으로 조정될 수 있으므로, 출발 전에 반드시 [한강사업본부 홈페이지](https://hangang.seoul.go.kr)에서 실시간 운영 상태를 꼭 확인하시기 바랍니다.

### 💡 실패 없는 야간 수영장 이용 핵심 팁
안전하고 쾌적한 피서를 위해 아래 세팅 항목들을 출발 전에 꼭 체크해 두시기를 제안합니다.

1. **온도 유지 및 비치웨어 챙기기**: 밤이 되면 한강의 밤바람으로 체온이 급격히 낮아질 수 있습니다. 감기 예방을 위해 **대형 타월이나 걸칠 수 있는 비치 가운을 필수 지참**하세요.
2. **다둥이 카드 및 한전 복지 증빙 혜택**: 다자녀 가구나 장애인 등 한강공원 조례에 따른 요금 면제 대상자는 입장료 혜택이 큽니다. 매표소에 관련 증빙서류(다둥이 행복카드, 신분증 등)를 반드시 미리 챙겨 가세요.
3. **상세 정보 확인**: 상세한 입장료 및 할인 혜택은 [한강공원 공식 홈페이지](https://hangang.seoul.go.kr)에서 실시간 확인이 가능합니다.
4. **사전 예약 및 여유로운 타깃 설정**: 주말에는 인파가 매우 몰리므로 비교적 쾌적한 **평일 저녁 시간대를 이용하는 편이 효과적인 전술**입니다.

### 📊 주간 대 야간 한강공원 물놀이장 비교

| 구분 | 주간 물놀이 | 야간 물놀이 |
| --- | --- | --- |
| **분위기** | 활기찬 에너지 | 낭만적인 한강 대교 야경 |
| **기온** | 뜨거운 태양과 자외선 노출 | 시원하고 기분 좋은 대류 강바람 |
| **목적** | 자외선 피하며 놀기 | 고요한 힐링 및 열대야 탈출 |

퇴근 후 주어지는 하루의 자투리 2시간을 어떻게 효율적으로 배치하고 설계하느냐에 따라 열대야 스트레스를 건강한 취미로 승화시킬 수 있습니다. 바쁜 현대인들의 삶 속에서 진정한 저녁의 여유와 하루 24시간을 영리하게 가꾸는 비결이 궁금하다면 무림북 블로그의 [직장인 시간 관리와 효율 공부법 칼럼](https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%82%b6%ec%9d%98-%ec%a7%88%ec%9d%84-%eb%b0%94%ea%be%b8%eb%8a%94-%ec%8b%9c%ea%b0%84-%ea%b4%80%eb%a6%ac/)을 통해 인생의 타임라인을 튜닝하는 아이디어를 함께 얻어가시기를 추천합니다. 

많은 분이 궁금해하시는 [서울시 공공서비스 예약 시스템](https://yeyak.seoul.go.kr)을 통해서도 사전 예약 여부를 체크해보시면 더욱 편리합니다. 주말보다는 비교적 여유로운 평일 저녁 시간을 공략하는 것도 팁입니다.

낮 동안의 뜨거웠던 열기를 식히고 시원한 밤하늘을 바라보며 물속에서 휴식하는 즐거운 경험을 이번 7월, 8월에 꼭 누리시길 응원합니다!

#한강공원 #야간수영장 #서울물놀이 #뚝섬수영장 #여의도물놀이 #여름휴가 #열대야극복 #서울가볼만한곳`;

  const work = {
    id: 'hangang_pool',
    title: '한강공원 수영장 야간 개장 가이드: 여름밤의 시원한 탈출기',
    description: contentMarkdown,
    thumbnail: '/thumbnails/hangang_pool_1783026874943.jpg',
    subtitle: '[블로그] 여행/정보',
    status: '공개예정',
    views: 0,
    created_at: scheduledTime
  };

  const { data, error } = await supabase
    .from('works')
    .upsert(work)
    .select();

  if (error) {
    console.error('Error inserting to Supabase:', error);
  } else {
    console.log('Successfully registered hangang_pool in Supabase:', data[0].id);
  }
}

main();
