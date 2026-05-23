import { callLLM } from './llm.js';
import { db } from '../db/index.js';
import { chapters, workStyleDNA } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function checkLogicConflict(chapterId: number): Promise<{ hasConflict: boolean; description?: string }> {
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) return { hasConflict: false };

  // 取章节前 4000 字作为上下文
  const content = chapter.content.slice(0, 4000);
  if (content.length < 200) return { hasConflict: false };

  const messages = [
    { role: 'system', content: '你是一个小说逻辑检查器。检测以下文本中是否存在明显的逻辑矛盾（如角色状态突变、时间线错误、因果关系不合理）。只返回 JSON：{ "hasConflict": boolean, "description": string }' },
    { role: 'user', content: content },
  ];

  try {
    const res = await callLLM(messages, false);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { hasConflict: !!json.hasConflict, description: json.description };
  } catch {
    return { hasConflict: false };
  }
}

export async function checkStyleDrift(chapterId: number, workId: number): Promise<{ hasDrift: boolean; description?: string }> {
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  const [dna] = await db.select().from(workStyleDNA).where(eq(workStyleDNA.workId, workId)).limit(1);
  if (!chapter || !dna) return { hasDrift: false };

  // 取最近 2000 字
  const content = chapter.content.slice(-2000);
  if (content.length < 200) return { hasDrift: false };

  const dnaSummary = `平均句长: ${dna.avgSentenceLength || '-'}, 对话比例: ${dna.dialogueRatio || '-'}, 标志性词汇: ${(dna.signatureWords || []).slice(0, 5).join(', ')}`;

  const messages = [
    { role: 'system', content: `你是一个风格分析器。作品的 styleDNA: ${dnaSummary}。检测最近段落是否与作品整体风格有显著偏移。只返回 JSON：{ "hasDrift": boolean, "description": string }` },
    { role: 'user', content: content },
  ];

  try {
    const res = await callLLM(messages, false);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { hasDrift: !!json.hasDrift, description: json.description };
  } catch {
    return { hasDrift: false };
  }
}
