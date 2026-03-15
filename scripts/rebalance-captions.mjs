import dotenv from "dotenv";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config({ path: ".env.local" });

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error(
    "필수 환경변수 누락: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
  );
  process.exit(1);
}

const SETTINGS = {
  LONG_SENTENCE_CHARS: 52,
  MAX_GROUP_CHARS: 115,
  MAX_GROUP_SECONDS: 8.5,
  MIN_VISIBLE_SECONDS: 1.15,
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const prefixes = args
  .filter((v) => !v.startsWith("--"))
  .map((v) => v.replace(/^\/+|\/+$/g, ""))
  .filter(Boolean)
  .map((v) => (v.endsWith("/") ? v : `${v}/`));

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function splitSentences(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const matches = normalized.match(/[^.!?。！？\n]+(?:[.!?。！？]+|$)/g);
  if (!matches) return [normalized];

  return matches.map((s) => normalizeText(s)).filter(Boolean);
}

function parseSegmentsFromSavedJson(saved) {
  const aiResp = saved?.aiResp ?? saved;
  const segs = aiResp?.segments;

  if (Array.isArray(segs)) {
    return segs
      .map((s) => ({
        start: Number(s.start ?? s.t0 ?? 0),
        end: Number(s.end ?? s.t1 ?? 0),
        text: normalizeText(s.text ?? s.transcript ?? ""),
      }))
      .filter(
        (s) =>
          Number.isFinite(s.start) &&
          Number.isFinite(s.end) &&
          s.end > s.start &&
          s.text.length > 0
      );
  }

  const text = normalizeText(aiResp?.text);
  if (text) {
    return [{ start: 0, end: 999999, text }];
  }

  return [];
}

function toSentenceUnits(segments) {
  const units = [];

  for (const seg of segments) {
    const text = normalizeText(seg.text);
    if (!text) continue;

    const sentences = splitSentences(text);
    if (sentences.length <= 1) {
      units.push({ start: seg.start, end: seg.end, text });
      continue;
    }

    const totalDuration = Math.max(0.01, seg.end - seg.start);
    const weights = sentences.map((s) => Math.max(1, s.length));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    let cursor = seg.start;
    for (let i = 0; i < sentences.length; i++) {
      const isLast = i === sentences.length - 1;
      const sliceDuration = isLast
        ? Math.max(0.01, seg.end - cursor)
        : totalDuration * (weights[i] / weightSum);

      const nextEnd = isLast ? seg.end : Math.min(seg.end, cursor + sliceDuration);
      units.push({
        start: cursor,
        end: nextEnd,
        text: sentences[i],
      });
      cursor = nextEnd;
    }
  }

  return units.filter((u) => u.text);
}

function mergeUnitSlice(slice) {
  const start = slice[0].start;
  const end = slice[slice.length - 1].end;
  const text = normalizeText(slice.map((u) => u.text).join(" "));
  return { start, end, text };
}

function rebalanceSentenceUnits(units) {
  const out = [];
  let i = 0;

  while (i < units.length) {
    let picked = null;

    for (let take = 3; take >= 1; take--) {
      const slice = units.slice(i, i + take);
      if (!slice.length) continue;

      const merged = mergeUnitSlice(slice);
      const duration = merged.end - merged.start;
      const hasLongSentence = slice.some((u) => u.text.length >= SETTINGS.LONG_SENTENCE_CHARS);

      if (take === 3 && hasLongSentence) continue;
      if (merged.text.length > SETTINGS.MAX_GROUP_CHARS) continue;
      if (duration > SETTINGS.MAX_GROUP_SECONDS) continue;

      picked = merged;
      break;
    }

    if (!picked) {
      picked = mergeUnitSlice([units[i]]);
    }

    out.push(picked);
    i += splitSentences(picked.text).length || 1;
  }

  return out;
}

function enforceVisibilityFloor(segments) {
  if (!segments.length) return segments;

  const out = [];
  for (let i = 0; i < segments.length; i++) {
    const current = { ...segments[i] };
    const duration = current.end - current.start;

    if (duration >= SETTINGS.MIN_VISIBLE_SECONDS || i === segments.length - 1) {
      out.push(current);
      continue;
    }

    const next = segments[i + 1];
    if (!next) {
      out.push(current);
      continue;
    }

    out.push({
      start: current.start,
      end: next.end,
      text: normalizeText(`${current.text} ${next.text}`),
    });
    i += 1;
  }

  return out;
}

function rebalanceSegments(originalSegments) {
  const sentenceUnits = toSentenceUnits(originalSegments);
  const rebalanced = rebalanceSentenceUnits(sentenceUnits);
  return enforceVisibilityFloor(rebalanced);
}

function rebuildSavedJson(saved, segments) {
  const next = JSON.parse(JSON.stringify(saved || {}));
  const joinedText = normalizeText(segments.map((s) => s.text).join(" "));

  if (next?.aiResp && typeof next.aiResp === "object") {
    next.aiResp.segments = segments;
    next.aiResp.text = joinedText;
  } else if (Array.isArray(next?.segments) || typeof next?.text === "string") {
    next.segments = segments;
    next.text = joinedText;
  } else {
    next.aiResp = {
      ...(next.aiResp || {}),
      segments,
      text: joinedText,
    };
  }

  next.rebalanceMeta = {
    version: 1,
    longSentenceChars: SETTINGS.LONG_SENTENCE_CHARS,
    maxGroupChars: SETTINGS.MAX_GROUP_CHARS,
    maxGroupSeconds: SETTINGS.MAX_GROUP_SECONDS,
    minVisibleSeconds: SETTINGS.MIN_VISIBLE_SECONDS,
    updatedAt: new Date().toISOString(),
  };

  return next;
}

async function streamToString(body) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    body.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    body.on("error", reject);
    body.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

async function listAllJsonKeys(prefix = "") {
  const keys = [];
  let ContinuationToken = undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken,
      })
    );

    for (const item of res.Contents || []) {
      const key = item.Key || "";
      if (!key.endsWith(".json")) continue;
      if (key.includes("__backup/")) continue;
      if (!/^[^/]+\/\d+\.json$/i.test(key)) continue;
      keys.push(key);
    }

    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return keys.sort((a, b) => a.localeCompare(b, "ko"));
}

async function readJsonFromR2(key) {
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );

  const text = await streamToString(res.Body);
  return JSON.parse(text);
}

async function writeJsonToR2(key, value) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(value, null, 2),
      ContentType: "application/json; charset=utf-8",
    })
  );
}

function summarizeSentencePattern(segments) {
  return segments.reduce(
    (acc, seg) => {
      const count = splitSentences(seg.text).length || 1;
      if (count === 1) acc.one += 1;
      else if (count === 2) acc.two += 1;
      else acc.threeOrMore += 1;
      return acc;
    },
    { one: 0, two: 0, threeOrMore: 0 }
  );
}

async function processKey(key) {
  const saved = await readJsonFromR2(key);
  const originalSegments = parseSegmentsFromSavedJson(saved);

  if (!originalSegments.length) {
    console.log(`⏭️  skip  ${key}  (segments 없음)`);
    return { skipped: 1, changed: 0 };
  }

  const rebalancedSegments = rebalanceSegments(originalSegments);
  const before = summarizeSentencePattern(originalSegments);
  const after = summarizeSentencePattern(rebalancedSegments);

  const same = JSON.stringify(originalSegments) === JSON.stringify(rebalancedSegments);
  if (same) {
    console.log(`✅ same  ${key}  (${originalSegments.length} → ${rebalancedSegments.length})`);
    return { skipped: 0, changed: 0 };
  }

  console.log(
    `🛠️  ${key}  (${originalSegments.length} → ${rebalancedSegments.length})  ` +
      `before[1:${before.one},2:${before.two},3+:${before.threeOrMore}] ` +
      `after[1:${after.one},2:${after.two},3+:${after.threeOrMore}]`
  );

  if (!dryRun) {
    const nextSaved = rebuildSavedJson(saved, rebalancedSegments);
    await writeJsonToR2(key, nextSaved);
  }

  return { skipped: 0, changed: 1 };
}

async function main() {
  console.log(`bucket=${R2_BUCKET_NAME}`);
  console.log(`dryRun=${dryRun ? "yes" : "no"}`);
  console.log(`prefixes=${prefixes.length ? prefixes.join(", ") : "(all)"}`);

  const keys = [];
  if (prefixes.length) {
    for (const prefix of prefixes) {
      keys.push(...(await listAllJsonKeys(prefix)));
    }
  } else {
    keys.push(...(await listAllJsonKeys()));
  }

  const uniqueKeys = [...new Set(keys)].sort((a, b) => a.localeCompare(b, "ko"));
  console.log(`대상 json 수: ${uniqueKeys.length}`);

  let changed = 0;
  let skipped = 0;
  let failed = 0;

  for (const key of uniqueKeys) {
    try {
      const result = await processKey(key);
      changed += result.changed;
      skipped += result.skipped;
    } catch (error) {
      failed += 1;
      console.error(`❌ fail  ${key} :: ${error.message}`);
    }
  }

  console.log(`\n완료`);
  console.log(`- 변경됨: ${changed}`);
  console.log(`- 건너뜀: ${skipped}`);
  console.log(`- 실패: ${failed}`);

  if (dryRun) {
    console.log("\n현재는 --dry-run 모드라서 실제 저장은 안 했습니다.");
  }
}

main().catch((error) => {
  console.error("치명적 오류:", error);
  process.exit(1);
});
