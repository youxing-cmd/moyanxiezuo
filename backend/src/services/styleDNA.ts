// 风格 DNA 提取服务
// 职责：纯文本统计分析，从章节内容中提取作者风格特征
// 不调用 LLM，只依赖正则和统计

import { db } from '../db/index.js';
import { chapters, workStyleDNA } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface StyleDNA {
  avgSentenceLength: number;
  shortSentenceRatio: number;
  longSentenceRatio: number;
  dialogueRatio: number;
  avgParagraphLength: number;
  commonPhrases: string[];
  signatureWords: string[];
  pacingPattern: string[];
  sampleSize: number;
}

function htmlToText(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '$1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '$1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '$1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPhrases(text: string, length: number): string[] {
  const freq = new Map<string, number>();
  // 过滤 HTML 实体和空白
  const clean = text.replace(/\s+/g, '');
  for (let i = 0; i <= clean.length - length; i++) {
    const phrase = clean.slice(i, i + length);
    // 只保留纯中文（不含标点、数字、英文）
    if (/^[一-龥]+$/.test(phrase)) {
      freq.set(phrase, (freq.get(phrase) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);
}

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '你', '他', '她', '它', '们',
  '和', '就', '不', '人', '有', '大', '这', '那', '上', '下',
  '来', '去', '说', '道', '看', '想', '着', '个', '为', '之',
  '而', '以', '于', '也', '与', '及', '其', '但', '因', '所',
  '被', '让', '把', '给', '向', '从', '到', '中', '里', '出',
  '过', '得', '很', '会', '能', '要', '都', '对', '将', '还',
  '只', '最', '更', '太', '已经', '可以', '现在', '自己', '没有',
  '知道', '什么', '怎么', '为什么', '一个', '一下', '一种',
  '他们', '我们', '你们', '那么', '这样', '那样', '如此',
  '时候', '地方', '东西', '事情', '感觉', '目光', '心中',
  '身体', '声音', '脸上', '眼神', '表情', '语气', '周围',
  '瞬间', '片刻', '一时间',
]);

export function extractStyleDNA(contents: string[]): StyleDNA | null {
  const allText = contents.map(htmlToText).join('\n');
  const totalChars = allText.replace(/\s/g, '').length;

  if (totalChars < 500) return null;

  // 分句：按句号、叹号、问号、换行分割
  const sentences = allText
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const sentenceLengths = sentences.map(s => s.length);
  const avgLen = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const shortRatio = sentenceLengths.filter(l => l < 15).length / sentenceLengths.length;
  const longRatio = sentenceLengths.filter(l => l > 40).length / sentenceLengths.length;

  // 对话比例：统计引号内的内容长度
  const dialogueMatches = allText.match(/[""'']([^""'']{3,200})[""'']/g) || [];
  const dialogueChars = dialogueMatches.reduce((sum, m) => sum + m.length, 0);
  const dialogueRatio = dialogueChars / totalChars;

  // 段落长度：按 \n\n 分段
  const paragraphs = allText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const avgParaLen = paragraphs.length > 0
    ? Math.round(paragraphs.reduce((sum, p) => sum + p.trim().length, 0) / paragraphs.length)
    : 0;

  // 四字短语（过滤后取前 20）
  const fourChar = extractPhrases(allText, 4);
  const commonPhrases = fourChar.slice(0, 20);

  // 双字高频词（过滤虚词后取前 15）
  const twoChar = extractPhrases(allText, 2);
  const signatureWords = twoChar
    .filter(w => !STOP_WORDS.has(w))
    .slice(0, 15);

  return {
    avgSentenceLength: Math.round(avgLen * 10) / 10,
    shortSentenceRatio: Math.round(shortRatio * 100) / 100,
    longSentenceRatio: Math.round(longRatio * 100) / 100,
    dialogueRatio: Math.round(dialogueRatio * 100) / 100,
    avgParagraphLength: avgParaLen,
    commonPhrases,
    signatureWords,
    pacingPattern: [],
    sampleSize: totalChars,
  };
}

export async function generateAndSaveStyleDNA(workId: number, userId: number): Promise<void> {
  try {
    const chapterList = await db.select({ content: chapters.content }).from(chapters).where(eq(chapters.workId, workId));
    const contents = chapterList.map(c => c.content || '').filter(Boolean);
    const dna = extractStyleDNA(contents);
    if (!dna) return;

    await db.insert(workStyleDNA).values({
      workId,
      userId,
      avgSentenceLength: dna.avgSentenceLength,
      shortSentenceRatio: dna.shortSentenceRatio,
      longSentenceRatio: dna.longSentenceRatio,
      dialogueRatio: dna.dialogueRatio,
      avgParagraphLength: dna.avgParagraphLength,
      commonPhrases: dna.commonPhrases,
      signatureWords: dna.signatureWords,
      pacingPattern: dna.pacingPattern,
      sampleSize: dna.sampleSize,
    }).onConflictDoUpdate({
      target: workStyleDNA.workId,
      set: {
        avgSentenceLength: dna.avgSentenceLength,
        shortSentenceRatio: dna.shortSentenceRatio,
        longSentenceRatio: dna.longSentenceRatio,
        dialogueRatio: dna.dialogueRatio,
        avgParagraphLength: dna.avgParagraphLength,
        commonPhrases: dna.commonPhrases,
        signatureWords: dna.signatureWords,
        pacingPattern: dna.pacingPattern,
        sampleSize: dna.sampleSize,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn('[styleDNA] 生成失败:', err);
  }
}

export function formatStyleDNAPrompt(dna: StyleDNA | null): string {
  if (!dna) return '';
  let prompt = '\n【风格 DNA】以下是从作者原文中提取的写作风格特征，AI 续写时必须严格遵守。\n';
  prompt += `- 平均句长约 ${dna.avgSentenceLength} 字`;
  if (dna.shortSentenceRatio > 0.3) prompt += '，偏好短句';
  if (dna.longSentenceRatio > 0.2) prompt += '，善用长句铺陈';
  prompt += '\n';

  if (dna.dialogueRatio > 0.3) {
    prompt += `- 对话占比较高（约 ${Math.round(dna.dialogueRatio * 100)}%），重视人物对白推动情节\n`;
  } else if (dna.dialogueRatio < 0.1) {
    prompt += `- 对话占比较低，偏重叙述与描写，减少无意义对白\n`;
  }

  if (dna.avgParagraphLength > 200) {
    prompt += `- 段落偏长，习惯于大段铺陈描写\n`;
  } else if (dna.avgParagraphLength < 80) {
    prompt += `- 段落偏短，节奏紧凑，多用分段制造节奏感\n`;
  }

  if (dna.signatureWords.length > 0) {
    prompt += `- 标志性用词偏好：${dna.signatureWords.slice(0, 8).join('、')}\n`;
  }

  if (dna.commonPhrases.length > 0) {
    prompt += `- 常用句式参考：${dna.commonPhrases.slice(0, 6).join('、')}\n`;
  }

  prompt += '注意：以上数据来自作者已写原文的统计分析，不是建议，是约束。AI 输出必须匹配这些特征。\n';
  return prompt;
}
