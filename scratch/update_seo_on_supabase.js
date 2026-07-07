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

async function updatePost(id, additionText) {
  // Fetch current description
  const { data, error } = await supabase.from('works').select('description').eq('id', id).single();
  if (error || !data) {
    console.error(`Error fetching ${id}:`, error);
    return;
  }

  let desc = data.description;
  
  // Clean up any previous link additions if we re-run
  if (desc.includes('## 🔗')) {
    desc = desc.split('## 🔗')[0].trim();
  } else if (desc.includes('---')) {
    // If it has tags at the bottom, let's keep them and inject the links before them
    const parts = desc.split('---');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('#')) {
        desc = parts.slice(0, parts.length - 1).join('---').trim();
      }
    }
  }

  // Combine with addition
  const newDesc = `${desc}\n\n${additionText}`;

  // Update Supabase
  const { error: updateError } = await supabase
    .from('works')
    .update({ description: newDesc })
    .eq('id', id);

  if (updateError) {
    console.error(`Error updating ${id}:`, updateError);
  } else {
    console.log(`Successfully updated SEO links and tags for ${id}!`);
  }
}

async function main() {
  // 1. time_study
  const timeStudyAddition = `---

## 🔗 함께 읽으면 좋은 생산성 및 자기계발 추천 링크
* **부자들의 성공 습관**: 인생의 장기 성취와 재정적 통제를 완성한 거장들의 삶을 엿보고 싶으시다면 [삼성 이병철 회장 부자 습관 칼럼](https://blog.murimbook.com/%ec%82%bc%ec%84%b1-%ec%9d%b4%eb%b3%91%ec%b2%a0-%ed%9a%8c%ec%9e%a5%ec%9d%b4-%ea%bf%b0%eb%9a%ab%ec%96%b4-%eb%b3%b8-%eb%b6%80%ec%9e%90-%ec%8a%b5%ea%b4%80/)을 꼭 읽어보시길 권장합니다.
* **집중력 훈련 이론**: 뇌의 인출 훈련 및 뽀모도로 방법론의 학술적 근거는 위키백과의 [포모도로 기법 위키백과](https://ko.wikipedia.org/wiki/%ED%8F%AC%EB%AA%A8%EB%8F%84%EB%A1%9C_%EA%B8%B0%EB%B2%95)에서 더 깊이 찾아보실 수 있습니다.

---
\`#시간관리\` \`#공부법\` \`#집중력향상\` \`#자기계발\` \`#생산성\` \`#뽀모도로\` \`#학습전략\` \`#몰입\``;

  // 2. brokerage-tips
  const brokerageAddition = `---

## 🔗 함께 읽으면 좋은 재테크 및 공과금 절약 추천 링크
* **소비 통제와 성공 루틴**: 수수료 절약과 같이 삶의 소소한 지출 통제를 자산 증식으로 연결하는 지혜는 [삼성 이병철 회장 부자 습관 칼럼](https://blog.murimbook.com/%ec%82%bc%ec%84%b1-%ec%9d%b4%eb%b3%91%ec%b2%a0-%ed%9a%8c%ec%9e%a5%ec%9d%b4-%ea%bf%b0%eb%9a%ab%ec%96%b4-%eb%b3%b8-%eb%b6%80%ec%9e%90-%ec%8a%b5%ea%b4%80/) 글을 통해 큰 영감을 얻으실 수 있습니다.
* **에너지 공과금 아끼기**: 부동산 수수료를 줄인 뒤 매달 새어 나가는 전기와 가스비를 통제하고 싶으시다면 무림북의 [전기세 절약 꿀팁 가이드](https://www.murimbook.com/work/electricity_save)도 반드시 함께 읽어보세요!

---
\`#부동산\` \`#중개수수료\` \`#부가세절약\` \`#부동산계약꿀팁\` \`#전세계약\` \`#아파트매매\` \`#공인중개사\` \`#부동산상식\``;

  // 3. automation-tips
  const automationAddition = `---

## 🔗 함께 읽으면 좋은 업무 생산성 추천 링크
* **생산성과 자산 축적의 비결**: 업무 효율화로 벌어들인 골든타임을 내 인생의 큰 성공과 투자 자산으로 정착시킨 위대한 리더들의 발자취는 [삼성 이병철 회장 부자 습관 칼럼](https://blog.murimbook.com/%ec%82%bc%ec%84%b1-%ec%9d%b4%eb%b3%91%ec%b2%a0-%ed%9a%8c%ec%9e%a5%ec%9d%b4-%ea%bf%b0%eb%9a%ab%ec%96%b4-%eb%b3%b8-%eb%b6%80%ec%9e%90-%ec%8a%b5%ea%b4%80/)을 꼭 독해해 보시길 강력히 권장합니다.
* **효율적인 시간 사용법**: 자동화 도구를 적용하기 전, 내 주의력과 시간을 어떻게 배치하고 스케줄링해야 하는지는 무림북의 [시간관리 공부법 몰입 가이드](https://www.murimbook.com/work/time_study)에서 완벽히 마스터해 보세요.

---
\`#업무자동화\` \`#생산성도구\` \`#ChatGPT활용법\` \`#Zapier연동\` \`#노션사용법\` \`#디지털트랜스포메이션\` \`#시간관리\` \`#스마트워크\``;

  await updatePost('time_study', timeStudyAddition);
  await updatePost('brokerage-tips', brokerageAddition);
  await updatePost('automation-tips', automationAddition);
}

main();
