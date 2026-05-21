import { REFLECTION_RULES } from '../config/reflectionRules.js';
import { callLLM } from './llm.js';

export interface ReflectionResult {
  passed: boolean;
  reason?: string;
  suggestion?: string;
}

export async function reflectStep(step: {
  taskType: string;
  output: Record<string, unknown>;
}): Promise<ReflectionResult> {
  const rules = REFLECTION_RULES[step.taskType];
  if (!rules) {
    // 非产出型步骤无需反思
    return { passed: true };
  }

  // 1. 确定性快速检查
  for (const rule of rules.deterministic) {
    if (!rule.check(step.output)) {
      return {
        passed: false,
        reason: rule.message,
        suggestion: rule.fix,
      };
    }
  }

  // 2. LLM 慢速反思（可选）
  if (rules.llmCheck && typeof step.output.content === 'string') {
    try {
      const res = await callLLM(
        [
          { role: 'system', content: rules.llmCheck.prompt },
          { role: 'user', content: step.output.content },
        ],
        false,
      );
      const data = await res.json();
      const result = data.choices?.[0]?.message?.content || '';

      const lower = result.toLowerCase();
      if (
        lower.includes('不通过') ||
        lower.includes('失败') ||
        lower.includes('未通过') ||
        lower.includes('不通过')
      ) {
        return {
          passed: false,
          reason: 'LLM 反思未通过',
          suggestion: result,
        };
      }
    } catch (err) {
      // LLM 反思失败不阻断，视为通过
      console.warn('[reflector] LLM 反思调用失败:', err);
    }
  }

  return { passed: true };
}
