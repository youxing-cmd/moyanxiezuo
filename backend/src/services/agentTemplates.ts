// agentTemplates.ts — Plan 模板管理（官方 + 用户自定义）

import { db } from '../db/index.js';
import { agentPlanTemplates } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface PlanTemplate {
  id: number;
  userId: number;
  name: string;
  description: string;
  queryPattern: string; // 正则或关键词，用于匹配用户 query
  plan: Record<string, unknown>;
  useCount: number;
  isOfficial?: boolean;
}

// ===== 官方内置模板 =====
const OFFICIAL_TEMPLATES: Omit<PlanTemplate, 'id' | 'useCount'>[] = [
  {
    userId: 0, // 0 表示官方
    name: '写一章正文',
    description: '读取作品上下文 → 生成章纲 → 写正文 → 自检 → 保存产物',
    queryPattern: '写一章|续写|写正文|写内容',
    plan: {
      title: '写一章正文',
      estimatedDuration: '3-5 分钟',
      estimatedCost: '约 4 次 LLM 调用',
      steps: [
        { id: '1', type: 'read_context', title: '读取作品上下文', dependsOn: [] },
        { id: '2', type: 'draft_outline', title: '生成本章大纲', dependsOn: ['1'] },
        { id: '3', type: 'write_chunk', title: '写正文', dependsOn: ['2'] },
        { id: '4', type: 'self_review', title: '自检', dependsOn: ['3'] },
        { id: '5', type: 'create_artifact', title: '保存章节草稿', dependsOn: ['4'], input: { type: 'chapter_draft' } },
      ],
    },
  },
  {
    userId: 0,
    name: '审稿检查',
    description: '读取作品上下文 → 六维度自检 → 生成审稿报告',
    queryPattern: '审稿|检查|看看|评价|点评',
    plan: {
      title: '审稿检查',
      estimatedDuration: '2-3 分钟',
      estimatedCost: '约 6 次 LLM 调用',
      steps: [
        { id: '1', type: 'read_context', title: '读取作品上下文', dependsOn: [] },
        { id: '2', type: 'self_review', title: '六维度自检', dependsOn: ['1'] },
        { id: '3', type: 'create_artifact', title: '保存审稿报告', dependsOn: ['2'], input: { type: 'review_report' } },
      ],
    },
  },
  {
    userId: 0,
    name: '参考爆款创作',
    description: '研究参考作品 → 生成创作方向 → 用户选择 → 写作 → 自检',
    queryPattern: '参考|模仿|爆款|仿写|借鉴',
    plan: {
      title: '参考爆款创作',
      estimatedDuration: '5-8 分钟',
      estimatedCost: '约 6 次 LLM + 3 次搜索',
      steps: [
        { id: '1', type: 'read_context', title: '读取作品上下文', dependsOn: [] },
        { id: '2', type: 'web_research', title: '研究参考作品', dependsOn: [] },
        { id: '3', type: 'generate_ideas', title: '生成创作方向', dependsOn: ['1', '2'] },
        { id: '4', type: 'user_input', title: '等你选择方向', dependsOn: ['3'] },
        { id: '5', type: 'write_chunk', title: '写正文', dependsOn: ['4'] },
        { id: '6', type: 'self_review', title: '自检', dependsOn: ['5'] },
        { id: '7', type: 'create_artifact', title: '保存正文草稿', dependsOn: ['6'], input: { type: 'chapter_draft' } },
      ],
    },
  },
  {
    userId: 0,
    name: '章纲转正文',
    description: '读取作品上下文 → 写正文 → 自检 → 保存产物',
    queryPattern: '章纲|大纲|转正文|扩写',
    plan: {
      title: '章纲转正文',
      estimatedDuration: '3-5 分钟',
      estimatedCost: '约 3 次 LLM 调用',
      steps: [
        { id: '1', type: 'read_context', title: '读取作品上下文', dependsOn: [] },
        { id: '2', type: 'write_chunk', title: '根据章纲写正文', dependsOn: ['1'] },
        { id: '3', type: 'self_review', title: '自检', dependsOn: ['2'] },
        { id: '4', type: 'create_artifact', title: '保存正文草稿', dependsOn: ['3'], input: { type: 'chapter_draft' } },
      ],
    },
  },
  {
    userId: 0,
    name: '标题简介包装',
    description: '读取作品上下文 → 生成标题/简介方案 → 用户选择 → 保存产物',
    queryPattern: '标题|简介|包装|起名|取名',
    plan: {
      title: '标题简介包装',
      estimatedDuration: '1-2 分钟',
      estimatedCost: '约 3 次 LLM 调用',
      steps: [
        { id: '1', type: 'read_context', title: '读取作品上下文', dependsOn: [] },
        { id: '2', type: 'generate_ideas', title: '生成标题/简介方案', dependsOn: ['1'] },
        { id: '3', type: 'user_input', title: '等你选择', dependsOn: ['2'] },
        { id: '4', type: 'self_review', title: '自检', dependsOn: ['3'] },
        { id: '5', type: 'create_artifact', title: '保存方案', dependsOn: ['4'], input: { type: 'inspiration' } },
      ],
    },
  },
];

/** 将官方模板转换为内存对象 */
function getOfficialTemplates(): PlanTemplate[] {
  return OFFICIAL_TEMPLATES.map((t, idx) => ({
    ...t,
    id: -(idx + 1), // 负数 id 表示官方模板
    useCount: 0,
    isOfficial: true,
  }));
}

/** 根据 query 匹配最佳模板（官方 + 用户自定义） */
export async function matchTemplate(userId: number, query: string): Promise<PlanTemplate | null> {
  const allTemplates: PlanTemplate[] = [
    ...getOfficialTemplates(),
    ...(await listUserTemplates(userId)),
  ];

  let best: PlanTemplate | null = null;
  let bestScore = 0;

  for (const tmpl of allTemplates) {
    const pattern = tmpl.queryPattern || '';
    if (!pattern) continue;
    // 简单关键词匹配（按匹配到的关键词数量打分）
    const keywords = pattern.split('|').filter((k) => k.trim());
    let score = 0;
    for (const kw of keywords) {
      if (query.includes(kw.trim())) score++;
    }
    // 使用次数加权（用户自定义模板更有价值）
    if (!tmpl.isOfficial && score > 0) score += tmpl.useCount * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = tmpl;
    }
  }

  return bestScore > 0 ? best : null;
}

/** 列出用户的自定义模板 */
export async function listUserTemplates(userId: number): Promise<PlanTemplate[]> {
  const rows = await db
    .select()
    .from(agentPlanTemplates)
    .where(eq(agentPlanTemplates.userId, userId))
    .orderBy(desc(agentPlanTemplates.useCount));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    description: r.description,
    queryPattern: r.query,
    plan: r.plan as Record<string, unknown>,
    useCount: r.useCount,
  }));
}

/** 保存用户自定义模板（从已完成的 job plan 抽象化） */
export async function saveUserTemplate(
  userId: number,
  name: string,
  description: string,
  queryPattern: string,
  plan: Record<string, unknown>,
): Promise<PlanTemplate> {
  const [row] = await db
    .insert(agentPlanTemplates)
    .values({
      userId,
      name,
      description,
      query: queryPattern,
      plan,
      useCount: 0,
    })
    .returning();

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    queryPattern: row.query,
    plan: row.plan as Record<string, unknown>,
    useCount: row.useCount,
  };
}

/** 删除用户自定义模板 */
export async function deleteUserTemplate(userId: number, templateId: number): Promise<void> {
  await db
    .delete(agentPlanTemplates)
    .where(and(eq(agentPlanTemplates.id, templateId), eq(agentPlanTemplates.userId, userId)));
}

/** 增加模板使用次数 */
export async function incrementTemplateUse(templateId: number): Promise<void> {
  if (templateId < 0) return; // 官方模板不计数
  await db
    .update(agentPlanTemplates)
    .set({ useCount: sql<number>`${agentPlanTemplates.useCount} + 1` })
    .where(eq(agentPlanTemplates.id, templateId));
}
