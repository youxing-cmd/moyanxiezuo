// 章节摘要生成服务
// 职责：分析章节内容，提取结构化摘要信息
// 触发方式：由 works.ts 在保存成功后异步调用，失败静默

import { callLLM } from './llm.js';

export interface ChapterSummaryResult {
  summary: string;
  keyEvents: string[];
  involvedCharacters: { name: string; action: string }[];
  openHooks: string[];
  characterChanges: { name: string; change: string }[];
}

export async function generateChapterSummary(
  content: string,
  title: string,
): Promise<ChapterSummaryResult | null> {
  // 去除 HTML 标签，取纯文本前 8000 字符（控制成本）
  const plainText = content
    .replace(/<[^]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  const truncated = plainText.slice(0, 8000);
  if (!truncated) return null;

  const prompt = `请分析以下小说章节，提取结构化信息。

章节标题：${title || '未命名'}

章节内容（前 8000 字符）：
${truncated}

输出要求：返回纯 JSON，无 markdown 围栏，无解释。格式：
{
  "summary": "100字以内的章节摘要，概括本章核心情节",
  "keyEvents": ["发生了什么事件1", "事件2"],
  "involvedCharacters": [{"name": "角色名", "action": "在本章做了什么关键行为"}],
  "openHooks": ["本章埋下的未回收悬念1", "悬念2"],
  "characterChanges": [{"name": "角色名", "change": "状态发生了什么变化，如突破、受伤、关系变化"}]
}

规则：
1. summary 必须控制在 100 字以内
2. keyEvents 只列本章实际发生的事件，不写推测
3. involvedCharacters 只列有实际出场的角色
4. openHooks 只列本章新埋下且未解决的悬念，不写已回收的
5. characterChanges 只列有实质性变化的角色
6. 如果没有某类信息，对应字段为空数组`;

  try {
    const res = await callLLM(
      [
        { role: 'system', content: '你是专业的小说分析助手，擅长提取章节关键信息。输出必须严格符合 JSON 格式。' },
        { role: 'user', content: prompt },
      ],
      false,
      null, // 使用默认模型配置（MVP 阶段）
    );

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonStr = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*$/g, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    return {
      summary: String(parsed.summary || '').slice(0, 200),
      keyEvents: Array.isArray(parsed.keyEvents) ? parsed.keyEvents.map(String) : [],
      involvedCharacters: Array.isArray(parsed.involvedCharacters)
        ? parsed.involvedCharacters.filter((c: any) => c && typeof c === 'object').map((c: any) => ({
            name: String(c.name || ''),
            action: String(c.action || ''),
          }))
        : [],
      openHooks: Array.isArray(parsed.openHooks) ? parsed.openHooks.map(String) : [],
      characterChanges: Array.isArray(parsed.characterChanges)
        ? parsed.characterChanges.filter((c: any) => c && typeof c === 'object').map((c: any) => ({
            name: String(c.name || ''),
            change: String(c.change || ''),
          }))
        : [],
    };
  } catch {
    return null;
  }
}
