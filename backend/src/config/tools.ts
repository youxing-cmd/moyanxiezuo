import type { ChatTool } from '../services/llm.js';
import { db } from '../db/index.js';
import { characters, outlines, aiArtifacts } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

// 工具执行位置：frontend = 前端调 jzEditor 执行；backend = 后端调 handler 执行
export type ToolExecution = 'frontend' | 'backend';

// 后端工具的执行上下文
export interface ToolContext {
  userId: number;
  workId?: number;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema (parameters 字段，对齐 OpenAI tool schema)
  execution: ToolExecution;
  // backend 工具的实现；frontend 工具留空（前端编排执行）
  handler?: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
}

// === 工具注册表 ===
const REGISTRY: Record<string, ToolDef> = {
  get_full_text: {
    name: 'get_full_text',
    description:
      '获取当前编辑器中正文的纯文本内容（不含 HTML 标签）。当用户提到"看看我现在写的"、"分析这段文字"、"我的稿子里"等需要了解当前正文内容的请求时调用。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execution: 'frontend',
  },
  get_selection: {
    name: 'get_selection',
    description:
      '获取用户当前在编辑器中选中（高亮）的文字。当用户说"这段"、"这句"、"我选中的"，或要求改写/润色/分析时，应先调用此工具拿到选中内容。如果未选中文字会返回空字符串。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execution: 'frontend',
  },
  replace_selection: {
    name: 'replace_selection',
    description:
      '把用户在编辑器中选中的文字替换成新文本。常用于"改写选中段"、"润色这一段"等场景。调用前请确保已通过 get_selection 拿到选中内容。会保留段落结构（\\n 转换为换行）。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '替换后的新文本。',
        },
      },
      required: ['text'],
    },
    execution: 'frontend',
  },
  insert_at_cursor: {
    name: 'insert_at_cursor',
    description:
      '在用户当前光标处插入文本。常用于"在这里加一段"、"补充一句"等场景。文本中的 \\n 会转换为换行。如果用户当前选中了文字，会先删除选中再插入。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '要插入的文本内容。',
        },
      },
      required: ['text'],
    },
    execution: 'frontend',
  },
  append_paragraph: {
    name: 'append_paragraph',
    description:
      '在编辑器末尾追加一段新文本。常用于"在结尾补一句"、"加个收尾"等场景。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '追加的文本内容。',
        },
      },
      required: ['text'],
    },
    execution: 'frontend',
  },
  find_and_replace: {
    name: 'find_and_replace',
    description:
      '在编辑器正文中查找并替换指定文本。支持全局替换或只替换第一处匹配。',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: '要查找的文本（注意这是普通文本，不是正则表达式）',
        },
        replacement: {
          type: 'string',
          description: '替换后的文本',
        },
        replace_all: {
          type: 'boolean',
          description: '是否替换所有匹配项，false 则只替换第一处',
        },
      },
      required: ['pattern', 'replacement'],
    },
    execution: 'frontend',
  },
  get_chapter_list: {
    name: 'get_chapter_list',
    description:
      '获取当前作品的所有章节列表（标题、序号、字数）。当用户问"我有几章"、"下一章该写什么了"时调用。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execution: 'frontend',
  },
  // ===== backend 执行工具 =====
  get_characters: {
    name: 'get_characters',
    description:
      '从数据库获取当前作品的角色设定（角色名、性格、外貌、关系等）。当用户问"我的主角性格是什么"、"这个配角有哪些设定"时调用。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execution: 'backend',
    handler: async (_args, ctx) => {
      if (!ctx.workId) return '没有提供作品 ID';
      const rows = await db.select().from(characters).where(eq(characters.workId, ctx.workId));
      if (!rows.length) return '该作品目前没有角色设定。';
      return rows
        .map((c) => {
          const roleLabel = c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '反派' : '角色';
          const preview = c.content.length > 120 ? c.content.slice(0, 120) + '...' : c.content;
          return `- ${roleLabel}「${c.name}」：${preview}`;
        })
        .join('\n');
    },
  },
  get_outline: {
    name: 'get_outline',
    description:
      '从数据库获取当前作品的总纲（整体剧情走向、核心冲突、结局设计等）。当用户问"总纲里怎么写的"、"后面会发生什么"时调用。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execution: 'backend',
    handler: async (_args, ctx) => {
      if (!ctx.workId) return '没有提供作品 ID';
      const [outline] = await db.select().from(outlines).where(eq(outlines.workId, ctx.workId)).limit(1);
      if (!outline || !outline.content) return '该作品目前没有总纲。';
      return outline.content;
    },
  },

  // ===== Artifact 工具 =====
  create_artifact: {
    name: 'create_artifact',
    description:
      '创建一个 AI 生成的文件（artifact）。当需要生成大纲、人物设定、世界观设定、剧情分析等内容时调用。内容会先存为 artifact，用户确认后才会同步到正式表。type 可选：outline/character/setting/note/analysis。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文件标题，如"第三卷大纲"、"反派人物设定"' },
        content: { type: 'string', description: '文件完整内容' },
        type: { type: 'string', enum: ['outline', 'character', 'setting', 'note', 'analysis'], description: '文件类型' },
      },
      required: ['title', 'content'],
    },
    execution: 'backend',
    handler: async (args, ctx) => {
      if (!ctx.workId) return JSON.stringify({ error: '没有提供作品 ID' });
      const [result] = await db.insert(aiArtifacts).values({
        workId: ctx.workId,
        userId: ctx.userId,
        type: (args.type as string) || 'note',
        title: (args.title as string) || '未命名',
        content: (args.content as string) || '',
        status: 'pending',
      }).returning();
      return JSON.stringify({ ok: true, id: result.id, title: result.title, type: result.type });
    },
  },
  update_artifact: {
    name: 'update_artifact',
    description:
      '更新一个已有的 artifact 文件。需要提供 artifact ID 和要更新的字段。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'artifact ID' },
        title: { type: 'string', description: '新标题（可选）' },
        content: { type: 'string', description: '新内容（可选）' },
      },
      required: ['id'],
    },
    execution: 'backend',
    handler: async (args, ctx) => {
      if (!ctx.workId) return JSON.stringify({ error: '没有提供作品 ID' });
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (args.title !== undefined) updateData.title = args.title;
      if (args.content !== undefined) updateData.content = args.content;
      const [updated] = await db.update(aiArtifacts)
        .set(updateData)
        .where(and(eq(aiArtifacts.id, args.id as number), eq(aiArtifacts.userId, ctx.userId)))
        .returning();
      if (!updated) return JSON.stringify({ error: 'artifact 不存在' });
      return JSON.stringify({ ok: true, id: updated.id, title: updated.title });
    },
  },
  get_artifacts: {
    name: 'get_artifacts',
    description:
      '获取当前作品的所有 AI 生成文件（artifacts）。可用于查看之前生成过哪些内容，避免重复生成。',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '按类型筛选（可选）：outline/character/setting/note/analysis' },
      },
      required: [],
    },
    execution: 'backend',
    handler: async (args, ctx) => {
      if (!ctx.workId) return JSON.stringify({ error: '没有提供作品 ID' });
      const conditions = [eq(aiArtifacts.workId, ctx.workId)];
      if (args.type) conditions.push(eq(aiArtifacts.type, args.type as string));
      const rows = await db.select().from(aiArtifacts)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(aiArtifacts.createdAt));
      if (!rows.length) return '该作品目前没有 AI 生成文件。';
      return rows.map((a) => {
        const statusLabel = a.status === 'accepted' ? '✓已采纳' : a.status === 'rejected' ? '✗已拒绝' : '⏳待确认';
        const preview = a.content.length > 100 ? a.content.slice(0, 100) + '...' : a.content;
        return `#${a.id} [${a.type}] ${a.title} (${statusLabel})\n${preview}`;
      }).join('\n\n');
    },
  },
  read_artifact: {
    name: 'read_artifact',
    description:
      '读取单个 artifact 的完整内容。需要提供 artifact ID。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'artifact ID' },
      },
      required: ['id'],
    },
    execution: 'backend',
    handler: async (args, ctx) => {
      if (!ctx.workId) return JSON.stringify({ error: '没有提供作品 ID' });
      const [artifact] = await db.select().from(aiArtifacts)
        .where(and(eq(aiArtifacts.id, args.id as number), eq(aiArtifacts.userId, ctx.userId)))
        .limit(1);
      if (!artifact) return JSON.stringify({ error: 'artifact 不存在' });
      return JSON.stringify({ id: artifact.id, title: artifact.title, type: artifact.type, content: artifact.content, status: artifact.status });
    },
  },
};

export function getTool(name: string): ToolDef | undefined {
  return REGISTRY[name];
}

// 把启用的工具白名单转成 OpenAI tool schema 数组（供 callLLM 使用）
export function getEnabledTools(names?: string[]): ChatTool[] {
  if (!names || names.length === 0) return [];
  const tools: ChatTool[] = [];
  for (const n of names) {
    const def = REGISTRY[n];
    if (!def) continue;
    tools.push({
      type: 'function',
      function: {
        name: def.name,
        description: def.description,
        parameters: def.parameters,
      },
    });
  }
  return tools;
}

// 列出所有已注册工具（用于调试或前端侧需要时）
export function listRegisteredTools(): ToolDef[] {
  return Object.values(REGISTRY);
}
