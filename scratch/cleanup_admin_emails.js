const fs = require("fs");
const path = require("path");

const files = [
  "app/admin/page.tsx",
  "app/api/admin/automation/approve-plan/route.ts",
  "app/api/admin/automation/create-plan/route.ts",
  "app/api/admin/automation/novels-on-disk/route.ts",
  "app/api/admin/automation/run/route.ts",
  "app/api/admin/delete-novel/route.ts",
  "app/api/admin/direct-upload/route.ts",
  "app/api/admin/grant-reward/route.ts",
  "app/api/admin/merge-chapters/route.ts",
  "app/api/admin/save-push-settings/route.ts",
  "app/api/admin/schedule-push/route.ts",
  "app/api/admin/tts/route.ts",
  "app/api/admin/upsert-episode/route.ts",
  "app/api/admin/upsert-novel/route.ts",
  "app/api/comments/[id]/route.ts",
  "app/api/comments/route.ts",
  "app/api/community/posts/route.ts",
  "app/api/dev/credit-points/route.ts",
  "app/api/me/membership-eligibility/route.ts",
  "app/api/media/sign/route.ts",
  "app/api/push/send/route.ts",
  "app/episode/[workId]/[id]/page.tsx",
  "app/me/page.tsx",
  "app/page.tsx",
  "app/work/[id]/page.tsx"
];

for (const relPath of files) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.log("File not found:", relPath);
    continue;
  }

  let content = fs.readFileSync(fullPath, "utf8");
  let replaced = false;

  // Pattern A
  const patternA = /user\.email === "youngkwang79@gmail\.com", "youngkwang7979@gmail\.com" \|\| user\.email === "youngkwang7979@gmail\.com"/g;
  if (patternA.test(content)) {
    content = content.replace(patternA, 'user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com"');
    replaced = true;
  }

  // Pattern B
  const patternB = /user\?\.email === "youngkwang79@gmail\.com", "youngkwang7979@gmail\.com" \|\| user\?\.email === "youngkwang7979@gmail\.com"/g;
  if (patternB.test(content)) {
    content = content.replace(patternB, 'user?.email === "youngkwang79@gmail.com" || user?.email === "youngkwang7979@gmail.com"');
    replaced = true;
  }

  // Pattern C
  const patternC = /u\.email === "youngkwang79@gmail\.com", "youngkwang7979@gmail\.com" \|\| u\.email === "youngkwang7979@gmail\.com"/g;
  if (patternC.test(content)) {
    content = content.replace(patternC, 'u.email === "youngkwang79@gmail.com" || u.email === "youngkwang7979@gmail.com"');
    replaced = true;
  }

  if (replaced) {
    fs.writeFileSync(fullPath, content, "utf8");
    console.log("Successfully cleaned up:", relPath);
  } else {
    console.log("No corrupted admin checks found in:", relPath);
  }
}
