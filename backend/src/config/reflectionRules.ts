// 反思规则配置：每个产出型 task type 对应的自检规则

export interface ReflectionRule {
  // 快速确定性检查（无需 LLM）
  deterministic: Array<{
    check: (output: Record<string, unknown>) => boolean;
    message: string;
    fix: string;
  }>;
  // LLM 慢速反思（可选）
  llmCheck?: {
    prompt: string;
  };
}

export const REFLECTION_RULES: Partial<Record<string, ReflectionRule>> = {
  write_chunk: {
    deterministic: [
      {
        check: (out) => typeof out.content === 'string' && out.content.length >= 200,
        message: '正文段字数不足（< 200 字）',
        fix: '请扩写至至少 200 字，确保情节有实质推进',
      },
    ],
    llmCheck: {
      prompt: `你是中文网文质量审查员。请审查以下正文段，检查：
1. 开头 100 字内是否有强钩子（悬念、冲突、反常）
2. 段落中是否有情节推进（非纯描写/对话）
3. 结尾是否留有悬念或冲突升级

只输出"通过"或"不通过：原因"。`,
    },
  },

  draft_outline: {
    deterministic: [
      {
        check: (out) => typeof out.content === 'string' && out.content.length >= 100,
        message: '大纲内容过短',
        fix: '请补充主线、支线、关键转折点的结构设计',
      },
    ],
    llmCheck: {
      prompt: `你是网文结构审查员。请审查以下大纲，检查：
1. 是否有清晰的三幕结构或起承转合
2. 关键转折点是否明确
3. 是否有贯穿始终的核心冲突

只输出"通过"或"不通过：原因"。`,
    },
  },

  generate_ideas: {
    deterministic: [
      {
        check: (out) => {
          const c = typeof out.content === 'string' ? out.content : '';
          // 支持多种编号格式：1. / 1、 / ## 方向一 / ### 1. / - 方向1
          const numbered = (c.match(/\d+[.、]/g) || []).length;
          const markdownHeaders = (c.match(/^#{2,3}\s+/gm) || []).length;
          const listItems = (c.match(/^[-*]\s+/gm) || []).length;
          const chineseNumbers = (c.match(/[一二三四五六七八九十]+[、.]/g) || []).length;
          return numbered >= 2 || markdownHeaders >= 2 || listItems >= 3 || chineseNumbers >= 2;
        },
        message: '未生成足够的题材方向（需至少 3 个）',
        fix: '请确保输出包含 3 个差异化的题材方向，每个方向有标题和核心梗',
      },
    ],
  },

  create_artifact: {
    deterministic: [
      {
        check: (out) => typeof out.artifactId === 'number',
        message: 'artifact 创建失败',
        fix: '检查 aiArtifacts 插入逻辑',
      },
    ],
  },
};
