// 个人写作记忆聚合服务
// 职责：从用户全部作品自动提取偏好，生成用户级写作记忆摘要
// 不调用 LLM，只依赖统计聚合

import { db } from '../db/index.js';
import { works, workStyleDNA, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface UserWritingMemory {
  genrePreferences: string[];
  perspectivePreference: string;
  pacingPreference: string;
  protagonistTypes: string[];
  bannedExpressions: string[];
  narrativeHabits: string[];
  aiPreferenceSummary: string;
  aggregatedStyleDNA: {
    avgSentenceLength: number;
    dialogueRatio: number;
    signatureWords: string[];
    sampleSize: number;
  };
}

export async function extractUserWritingMemory(userId: number): Promise<UserWritingMemory> {
  // 查用户所有作品
  const workList = await db.select().from(works).where(eq(works.userId, userId));

  // 题材统计
  const genreFreq = new Map<string, number>();
  const perspectiveFreq = new Map<string, number>();
  for (const w of workList) {
    if (w.genre) genreFreq.set(w.genre, (genreFreq.get(w.genre) || 0) + 1);
    if (w.perspective) perspectiveFreq.set(w.perspective, (perspectiveFreq.get(w.perspective) || 0) + 1);
  }
  const genrePreferences = Array.from(genreFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  // 视角偏好
  const perspectiveEntries = Array.from(perspectiveFreq.entries()).sort((a, b) => b[1] - a[1]);
  const perspectivePreference = perspectiveEntries[0]?.[0] || '';

  // 风格 DNA 聚合
  const workIds = workList.map(w => w.id);
  let totalSampleSize = 0;
  let weightedSentenceLength = 0;
  let weightedDialogueRatio = 0;
  const allSignatureWords = new Map<string, number>();

  if (workIds.length > 0) {
    const dnaList = await db.select().from(workStyleDNA)
      .where(eq(workStyleDNA.userId, userId));

    for (const dna of dnaList) {
      const size = dna.sampleSize || 0;
      if (size <= 0) continue;
      totalSampleSize += size;
      weightedSentenceLength += (dna.avgSentenceLength || 0) * size;
      weightedDialogueRatio += (dna.dialogueRatio || 0) * size;

      for (const w of (dna.signatureWords || [])) {
        allSignatureWords.set(w, (allSignatureWords.get(w) || 0) + 1);
      }
    }
  }

  const avgSentenceLength = totalSampleSize > 0
    ? Math.round((weightedSentenceLength / totalSampleSize) * 10) / 10
    : 0;
  const dialogueRatio = totalSampleSize > 0
    ? Math.round((weightedDialogueRatio / totalSampleSize) * 100) / 100
    : 0;
  const signatureWords = Array.from(allSignatureWords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);

  // 生成 AI 偏好摘要
  const summaryParts: string[] = [];
  if (genrePreferences.length > 0) summaryParts.push(`偏好${genrePreferences.join('、')}题材`);
  if (perspectivePreference === 'first') summaryParts.push('常用第一人称');
  else if (perspectivePreference === 'third') summaryParts.push('常用第三人称');
  if (avgSentenceLength > 0) summaryParts.push(`平均句长约 ${avgSentenceLength} 字`);
  if (dialogueRatio > 0) summaryParts.push(`对话占比约 ${Math.round(dialogueRatio * 100)}%`);
  if (signatureWords.length > 0) summaryParts.push(`标志性用词：${signatureWords.slice(0, 5).join('、')}`);

  const aiPreferenceSummary = summaryParts.length > 0
    ? summaryParts.join('，') + '。'
    : '';

  return {
    genrePreferences,
    perspectivePreference,
    pacingPreference: '',
    protagonistTypes: [],
    bannedExpressions: [],
    narrativeHabits: [],
    aiPreferenceSummary,
    aggregatedStyleDNA: {
      avgSentenceLength,
      dialogueRatio,
      signatureWords,
      sampleSize: totalSampleSize,
    },
  };
}

export async function refreshUserWritingMemory(userId: number): Promise<UserWritingMemory> {
  const memory = await extractUserWritingMemory(userId);
  await db.update(users).set({ writingMemory: memory }).where(eq(users.id, userId));
  return memory;
}
