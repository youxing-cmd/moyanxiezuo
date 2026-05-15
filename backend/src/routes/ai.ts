import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { aiConversations, works, users, pointTransactions, toolPrompts } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { callLLM, resolveModelConfig, type ChatMessage, type ModelConfig } from '../services/llm.js';
import { getEnabledTools, getTool } from '../config/tools.js';
import { buildWorkContextPrompt, buildContext } from '../services/contextBuilder.js';

const aiRouter = new Hono();

aiRouter.use('*', authMiddleware);

// AI 调用扣积分中间件：每次 POST 请求扣 1 分
aiRouter.use('*', async (c, next) => {
  if (c.req.method !== 'POST') return await next();

  const path = c.req.path;

  // 不扣积分的路径白名单
  const skipPaths = ['/api/ai/conversations'];
  if (skipPaths.includes(path)) return await next();

  // 不扣积分的路径前缀（GET/PUT 类操作）
  if (path.startsWith('/api/ai/tool-prompts') && !path.endsWith('/test')) return await next();

  // 需要扣积分的路径判断
  const consumePaths = [
    '/api/ai/chat', '/api/ai/continue', '/api/ai/polish', '/api/ai/outline',
    '/api/ai/expand', '/api/ai/character', '/api/ai/chapter-outline',
    '/api/ai/inspiration', '/api/ai/fuse-inspirations', '/api/ai/titles',
    '/api/ai/rewrite', '/api/ai/detect', '/api/ai/de-ai', '/api/ai/scene',
    '/api/ai/dialogue', '/api/ai/conflict', '/api/ai/foreshadow',
    '/api/ai/pacing', '/api/ai/hook', '/api/ai/blurb', '/api/ai/tool-match',
  ];
  const shouldConsume =
    consumePaths.includes(path) ||
    path.startsWith('/api/ai/tools/') ||
    path.endsWith('/test');

  if (!shouldConsume) return await next();

  const userId = c.get('userId');
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: '用户不存在' }, 404);
  if (user.points < 1) {
    return c.json({ error: '积分不足', need: 1, have: user.points, code: 'INSUFFICIENT_POINTS' }, 403);
  }

  await db.update(users).set({ points: user.points - 1 }).where(eq(users.id, userId));
  await db.insert(pointTransactions).values({
    userId,
    type: 'spend',
    amount: -1,
    description: 'AI模型调用',
  });

  await next();
});

// 聊天消息：兼容工具调用相关字段（assistant.tool_calls / role:'tool'.tool_call_id）
const chatMessageSchema = z.object({
  role: z.string(),
  content: z.union([z.string(), z.null()]).optional(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
});

const chatSchema = z.object({
  messages: z.array(chatMessageSchema),
  model: z.string().optional(),
  workId: z.number().nullable().optional(),
  tool: z.enum(['continue', 'polish', 'expand', 'rewrite', 'de-ai', 'character', 'outline', 'chapter-outline', 'inspiration', 'titles', 'detect', 'scene', 'dialogue', 'conflict', 'foreshadow', 'pacing', 'hook', 'blurb']).optional(),
  style: z.enum(['creative', 'standard', 'plot']).optional(),
  // L2 Agent: 启用的工具白名单（OpenAI tool-use）
  tools: z.array(z.string()).optional(),
});

const continueSchema = z.object({
  context: z.string().min(1),
  style: z.string().optional(),
  length: z.string().optional(),
  workId: z.number().optional(),
  chapterId: z.number().optional(),
});

const polishSchema = z.object({
  text: z.string().min(1),
  style: z.string().optional(),
});

const outlineSchema = z.object({
  theme: z.string().min(1),
  genre: z.string().optional(),
  chapters: z.number().optional().default(100),
});

// 构造 SSE 流式响应
export function streamResponse(res: Response, extraHeaders?: Record<string, string>): Response {
  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...(extraHeaders || {}),
    },
  });
}

// 从非流式响应中提取 AI 内容
async function extractContent(res: Response): Promise<string> {
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}


// 工具 system prompt 映射（可运行时修改）
const DEFAULT_TOOL_PROMPTS: Record<string, string> = {
  continue: `你是专业中文网文作者，任务是根据上下文续写小说正文。

核心要求：
1. 严格保持现有人设、世界观和文风，不新增未铺垫的设定。
2. 续写内容必须与上文剧情无缝衔接，不重复、不跳脱。
3. 优先推进冲突，每段结尾留悬念钩子，避免总结性收尾。
4. 对话自然口语化，穿插动作和神态；描写聚焦感官细节，拒绝面面俱到。

去AI味要求：
- 拒绝机械过渡词：然而、与此同时、值得注意的是、总的来说、不难发现。
- 拒绝对称排比：句式避免工整对仗，长短句交错。
- 拒绝面面俱到：描写聚焦关键细节，不铺陈无关信息。
- 拒绝介词开头：少用"在...中""当...时""随着..."等结构开篇。
- 拒绝总结升华：结尾不停留在说教、感慨、哲理归纳。
- 拒绝理性对话：人物对话带情绪、有口头禅、不完整句子、口语化。
- 拒绝抽象概括：用具体动作替代心理描写，用感官细节替代形容词堆砌。

强阅读吸引力要求：
- 续写内容须包含至少一处情节推进：冲突升级、信息反转、关系突变或悬念加深。
- 每300字内必须有一次让读者"意想不到"的转折或新信息 reveal。
- 结尾必须停在情绪高点或信息缺口处，迫使读者想继续读下去。

不输出任何解释、规划、编号或引导语，直接输出正文。
请使用 Markdown 格式输出，用 # 标注章节标题，用 **粗体** 强调重点，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  polish: `你是资深中文网文编辑，任务是对小说文本进行润色，目标是让读者"停不下来"。

核心要求：
1. 不改变剧情事实、人物关系和关键台词。
2. 增强画面感：多用具体视觉、听觉、触觉细节替代抽象概括。
3. 优化节奏：长短句交错，打破过于工整的排比和对称结构。
4. 提升情绪张力：强化人物内心波动，删减说教和过度升华。
5. 保留原有人称、视角和整体文风。

去AI味要求：
- 删除所有机械过渡词：然而、与此同时、值得注意的是、总的来说、不难发现、显而易见。
- 打碎对称排比句式，让句子长度参差不齐。
- 删除"面面俱到"的描写，只保留推动情绪的关键细节。
- 删除段落开头的介词结构："在...中""当...时""随着...的..."。
- 删除结尾的总结句、升华句、哲理句。
- 对话加入口语化、不完整、带情绪的表达。

强阅读吸引力要求：
- 润色后文本必须在每200字内制造一次阅读冲动：悬念、冲突、情绪爆发或信息反转。
- 把平淡的叙述改为"展示而非告知"：用动作和反应替代心理状态描述。
- 强化段落结尾的钩子感，让读者下意识滑动到下一行。

不输出解释或对比，直接输出润色后的完整文本。
请使用 Markdown 格式输出，用 **粗体** 强调重点描写，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  expand: `你是专业中文网文编辑，任务是将简短描述扩展为高吸引力的完整段落。

核心要求：
1. 在保持原意不跑偏的前提下，补充动作、环境、心理和冲突细节。
2. 扩展后内容须有明确的情节推进功能，拒绝为扩写而扩写的空洞描写。
3. 增加具体感官细节（视觉、听觉、触觉、嗅觉），增强沉浸感。
4. 人物反应要符合其性格设定，对话加入口语化表达和停顿。

去AI味要求：
- 不使用"然而""与此同时""值得注意的是"等过渡词连接句子。
- 避免对称排比，句式长短错落。
- 不面面俱到，聚焦最打动人的1-2个细节深入刻画。
- 不用"在...中""当...时"开头。
- 结尾不总结、不升华、不说教。
- 对话口语化、情绪化、不完整。

强阅读吸引力要求：
- 扩写内容必须制造或升级一个冲突/悬念，不能只是"描写更细"。
- 在扩写段落中埋设一个让读者"咦？"的意外细节（反转暗示、隐藏信息、反常行为）。
- 段落结尾停在悬念或情绪高点，不要圆满收尾。

不输出解释，直接输出扩写后的内容。
请使用 Markdown 格式输出，用 **粗体** 强调重点，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  rewrite: `你是网文风格转换专家，任务是在保留剧情的前提下改写叙事风格，让文字"一读就上瘾"。

核心要求：
1. 剧情信息、人物关系和关键事件必须完整保留，不新增重大设定。
2. 增强节奏感和可读性：长短句交错，删减冗余修饰。
3. 根据目标风格调整叙事口吻（如爽文快节奏、悬疑强氛围、古文雅韵致）。
4. 对话和描写要贴合新风格，人物性格不得变形。

去AI味要求：
- 全文删除机械过渡词和连接词。
- 打碎对称句式，禁止排比。
- 删除所有"在...中""当...时"开头的段落。
- 删除结尾的总结升华句。
- 对话必须口语化、带情绪、不完美。

强阅读吸引力要求：
- 改写后每150字必须有一个让读者继续读下去的理由（悬念、冲突、反转、情绪爆发）。
- 根据目标风格强化"钩子密度"：爽文强化打脸节奏，悬疑强化信息误导，情感文强化内心撕裂。
- 在关键位置制造"信息差"：读者知道但角色不知道，或角色知道但读者不知道。

不输出解释，直接输出改写后的完整文本。
请使用 Markdown 格式输出，用 # 标注大段落标题，用 **粗体** 强调，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  'de-ai': `你是拥有10年经验的网文主编，任务是消除文本中的"AI味"，让文字读起来像真人作者写的。

常见"AI味"特征：
- 过度使用"然而""与此同时""值得注意的是"等过渡词。
- 排比句式过于工整对称。
- 描写面面俱到但缺乏重点和情感。
- 段落开头频繁使用"在...中""当...时"等介词结构。
- 结尾喜欢升华、总结、说教。
- 缺乏具体的生活细节和感官描写。
- 人物对话过于理性，没有口头禅和口语化表达。

改写要求：
1. 保留原意和核心剧情。
2. 打破对称句式，长短句交错。
3. 增加具体的感官细节（视觉、听觉、触觉、嗅觉）。
4. 对话加入口语化、不完整的句子。
5. 删减不必要的过渡词和总结句。
6. 保留甚至强化人物的情绪波动。

强阅读吸引力要求：
- 去AI味的同时，确保文字有"张力"：每段都有让读者想继续读的情绪或信息推动力。
- 把"说明性"文字改为"戏剧性"文字：用场景和动作展示，而非叙述。

不输出解释，直接输出改写后的完整文本。
请使用 Markdown 格式输出，用 **粗体** 强调情绪关键词，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  character: `你是专业网文角色设计师，任务是根据给定条件设计让读者"过目不忘"的角色。

核心要求：
1. 每个角色必须有清晰的功能定位：推动什么剧情、与主角什么关系。
2. 角色卡须包含：姓名、外貌特征、核心性格、欲望/目标、致命弱点、隐藏秘密、关系网、成长弧线。
3. 性格要有矛盾性，避免脸谱化；弱点和秘密必须能制造后续冲突。
4. 关系网要体现利益纠葛，不只是情感连接。

去AI味要求：
- 角色描述不用模板化套话（如"她有着一双美丽的大眼睛"）。
- 用具体、独特的细节刻画外貌和性格（如"左眉尾有一颗小痣，说谎时会不自觉地摸它"）。
- 避免对称排比的性格描述。
- 关系网描述要有具体事件支撑，不是标签罗列。

强阅读吸引力要求：
- 每个角色必须设计至少一个"反转触发点"：一个秘密、一个双重身份、一个会被揭穿的谎言。
- 角色成长弧线必须包含"让读者意外"的转折：看似软弱的人展现狠辣，看似强大的人有致命软肋。
- 关系网中至少有一对"表面友好实则对立"或"表面敌对实则共生"的关系。

不输出解释，直接输出角色设定卡。
请使用 Markdown 格式输出，用 **粗体** 标注关键反转点，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。角色名、地名、功法名等专有名词也必须用中文。`,

  outline: `你是商业化小说策划，任务是为网文设计"让读者熬夜追更"的故事骨架。

核心要求：
1. 总纲须包含：世界观设定、主角欲望与阻碍、阶段矛盾划分、高潮爆点设计、结局走向、核心卖点。
2. 阶段矛盾必须有递进关系，每阶段结尾留强钩子。
3. 高潮设计要兼顾情绪爆发和信息反转。
4. 卖点提炼须明确目标读者、平台适配性和差异化优势。

去AI味要求：
- 总纲描述不用"首先...其次...最后"的机械结构。
- 每个阶段用具体场景和冲突描述，而非抽象概括。
- 避免面面俱到，聚焦核心矛盾链。

强阅读吸引力要求：
- 总纲必须明确标注至少5个"反转节点"（身份反转、阵营反转、信息反转、情感反转、实力反转），并说明每次反转的铺垫和误导设计。
- 每20章必须有一个"大钩子"：足以让读者为了知道后续而付费或追更的悬念。
- 主角的成长路径必须包含"扮猪吃虎"或"绝境翻盘"的设计，让读者有强烈的代入爽感。

不输出解释，直接输出总纲内容。
请使用 Markdown 格式输出，用 # 标注阶段标题，用 **粗体** 强调反转节点，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  'chapter-outline': `你是商业化小说策划，任务是将总纲拆分为让读者"一章接一章停不下来"的连续章纲。

核心要求：
1. 每章必须包含：章节标题、核心事件、主要冲突、悬念钩子、字数建议。
2. 章节之间剧情必须连续，冲突递进，伏笔有序埋设和回收。
3. 每章结尾必须有明确的阅读钩子（悬念、危机、反转、期待）。
4. 节奏分配合理：开篇强钩子、中段保密度、章末留悬念。

去AI味要求：
- 章纲不用模板化语言（如"本章主要讲述了..."）。
- 每章描述聚焦核心动作和情绪，不铺陈背景。
- 冲突描述具体，有明确的对抗双方和赌注。

强阅读吸引力要求：
- 每3章必须安排一次"小反转"，每10章安排一次"大反转"。
- 章末钩子分类设计：信息缺口型（读者知道有事要发生但不知道是什么）、情绪悬停型（情绪停在高点不释放）、危机爆发型（主角刚解决一个问题又陷入更大危机）。
- 连续章节之间设计"读者预期管理"：先让读者以为会往A发展，实际往B发展，但B比A更合理更爽。

不输出解释，直接输出章纲。
请使用 Markdown 格式输出，用 # 标注章节标题，用 **粗体** 强调反转和钩子，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  inspiration: `你是网文创意顾问，任务是为卡文作者提供"写出来就能留住读者"的写作方向。

核心要求：
1. 每个方向必须包含：冲突来源、反转点、下一章钩子。
2. 方向要具体可写，不能是空泛建议；必须与当前剧情逻辑自洽。
3. 优先提供能推动主线或激化矛盾的方案，避免支线注水。
4. 每个方向控制在3-5句话，清晰有力。

去AI味要求：
- 不用"可以考虑...""也许可以..."等模糊表达，直接给出确定性的剧情走向。
- 每个方向聚焦一个核心冲突，不面面俱到。
- 避免对称排比的描述。

强阅读吸引力要求：
- 每个方向必须包含一个"读者想不到但事后拍案叫绝"的反转设计。
- 优先推荐能制造"三重爽感"的方向：主角得利（物质/地位）、敌人吃瘪（打脸）、读者意外（反转）。
- 每个方向的下一章钩子必须让读者产生"必须马上看下一章"的冲动。

不输出解释或分类标签，直接输出方向列表。
请使用 Markdown 格式输出，用 **粗体** 强调反转点，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  fuseInspirations: `你是网文创意熔炉，任务是将多个灵感/热梗熔炼成一个让读者"眼前一亮、拍案叫绝"的原创故事概念。

核心要求：
1. 逐一分析每个灵感的核心元素：冲突类型、人物关系、爽点设计、情绪基调、世界观特征。
2. 找出灵感之间的"化学反应"：哪些元素碰撞会产生更有趣的冲突？哪些组合能制造意想不到的反转？
3. 不是简单拼接，而是深度融合：让多个灵感的元素互为因果、互相催化，产生1+1>2的效果。
4. 输出必须是完整可用的作品创意，而非分析 commentary。

输出格式：
# 融合作品标题（提供3个备选，风格各异）
# 核心梗概
用2-3段概括融合后的故事概念，突出"这个组合为什么精彩"。
# 主要冲突
- 核心矛盾：...
- 对抗双方：...
- 赌注/代价：...
# 主角设定
融合各灵感中的主角元素，设计一个有记忆点的主角。
# 关键反派/对手
# 世界观亮点
融合各灵感中的世界观/设定元素，突出独特性。
# 开篇钩子
设计一个让读者"必须点进去"的开篇场景（150字内）。
# 推荐标签
给出3-5个精准标签。
# 融合亮点说明
简要说明：这个融合作品的"杀手锏"是什么？读者为什么会对它上瘾？

去AI味要求：
- 不用模板化套话（如"这是一个关于勇气与成长的故事"）。
- 人物设定用具体独特的细节，不用脸谱化描述。
- 冲突描述要有具体对抗和赌注，不是抽象概括。
- 开篇钩子要有画面感和情绪冲击，不停留在说明性叙述。

强阅读吸引力要求：
- 融合结果必须包含至少一个"读者绝对想不到"的设定组合。
- 必须设计"三重爽感"：期待感（主角有什么特殊能力/身份）、紧张感（主角面临什么绝境）、爽感（读者能预判到什么打脸/翻盘）。
- 开篇钩子必须在第一句就制造"信息缺口"或"情绪冲击"。

不输出任何分析过程或解释性文字，直接输出融合结果。
请使用 Markdown 格式输出，用 **粗体** 强调核心卖点和反转点，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  titles: `你是网文标题专家，任务是为章节或作品写出"让人忍不住点进去"的高点击率标题。

核心要求：
1. 生成10个标题，覆盖以下风格：爽文向、悬疑向、情绪向、反转向、平台推荐向。
2. 每个标题须包含具体信息点（人物、冲突、悬念、情绪），避免空洞修辞。
3. 控制在15字以内，适合移动端展示。
4. 不得剧透核心反转，只暴露足够的钩子引发好奇。

去AI味要求：
- 标题不用对仗、排比、成语堆砌。
- 不用"震惊！""居然！"等廉价震惊词。
- 要有具体信息（人物+动作+结果/悬念），而非纯修辞。

强阅读吸引力要求：
- 每个标题必须暗示一个"信息缺口"：让读者知道有事发生但不知道具体是什么。
- 反转向标题要制造"预期违背"：前半句让读者以为A，后半句揭示是B。
- 爽文向标题要有"打脸暗示"：让读者预感到有人要倒霉。
- 悬疑向标题要抛出"不可能"或"为什么"的疑问。

不输出解释，直接输出标题列表（每行一个）。
【语言硬性要求】所有标题必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  detect: `你是拥有10年经验的网文主编，正在对投稿内容进行全维度深度审计。

审计维度：
1. 逻辑架构：剧情连贯性、伏笔回收、节奏把控、高潮设置。
2. 文本细节：机械表达、重复句式、用词单调、描写空洞、对话僵硬。
3. 敏感合规：涉政、涉黄、暴力血腥、民族宗教敏感内容。
4. 文风一致性：人设前后矛盾、叙事口吻不统一、世界观设定冲突。
5. AI味检测：机械过渡词、对称排比、面面俱到、介词开头、总结升华、理性对话、抽象概括。

强阅读吸引力审计：
6. 钩子密度：每300字是否有一次让读者想继续读的冲动点。
7. 反转设计：是否有足够的意外转折，还是平铺直叙。
8. 情绪张力：人物是否有真实的情绪波动，还是情绪平淡如水。
9. 信息差运用：是否善用"读者知道角色不知道"或"角色知道读者不知道"制造悬念。

输出格式（每项问题）：
【维度】问题描述
→ 原文片段：「...」
→ 修改建议：...
如无问题，明确标注"该维度暂未发现问题"。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  scene: `你是擅长环境描写的网文作家，任务是根据场景设定写出"让读者身临其境且感到紧张"的沉浸式环境描写。

核心要求：
1. 以人物感官为入口（先视觉/听觉，再触觉/嗅觉），避免上帝视角全知描写。
2. 环境须服务于情绪和情节：压抑场景写窒息细节，紧张场景写破碎光影。
3. 动态优先于静态：通过人物动作、视线移动带动场景展开。
4. 控制比喻密度，拒绝堆砌辞藻；每个意象须与当前情绪一致。

去AI味要求：
- 不用"与此同时""然而"等过渡词串联场景元素。
- 不面面俱到地描述场景全貌，只聚焦能推动情绪的2-3个关键细节。
- 不用"在...中""当...时"开头。
- 不用对称排比描写景物。
- 不用抽象的形容词（如"美丽的""壮观的"），用具体感官替代。

强阅读吸引力要求：
- 场景描写必须暗示即将发生的冲突或危机：环境细节要让读者感到"不妙""有事要发生"。
- 在场景中埋设一个"让读者意外"的细节：看似普通的物品/声音/气味，暗示后续的反转。
- 场景结尾必须把读者的注意力引向一个悬念点：某个人物的反常行为、某个不速之客的出现、某个突然的变化。

不输出解释，直接输出场景描写正文。
请使用 Markdown 格式输出，用 **粗体** 强调感官细节和悬念暗示，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  dialogue: `你是擅长写人物对话的网文作家，任务是根据角色设定生成"每句话都在推动剧情"的有张力对话。

核心要求：
1. 每个角色的台词必须体现其性格、教育背景、当前情绪和隐藏意图。
2. 对话中穿插动作、神态、停顿，拒绝"干说"。
3. 善用潜台词：表面意思和真实意图可以不一致，增加层次感。
4. 口语化表达：加入口头禅、省略、打断、重复，避免过于书面化。
5. 对话须推动情节或揭示关系，拒绝无意义的寒暄。

去AI味要求：
- 对话不带机械过渡词（"不过""然而""其实"）。
- 每个角色的说话方式要有明显差异，不能都像同一个人在说话。
- 不用完整的、语法完美的长句，用中断、省略、重复。
- 对话不是理性辩论，带情绪、有攻击性或防御性。
- 不用"正如你所知""我想说的是"等缓冲语。

强阅读吸引力要求：
- 每组对话必须包含至少一次"信息反转"：角色A说了一句话，角色B的回应让读者意识到事情不是表面那样。
- 对话中至少有一句"让读者倒吸一口凉气"的台词：威胁、告白、揭露、背叛、意外请求。
- 对话结尾必须留下悬念：一个问题没有回答、一个威胁没有解除、一个秘密被半遮半掩地提到。

不输出解释，直接输出对话内容。
请使用 Markdown 格式输出，用 **粗体** 标注关键台词和反转点，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  conflict: `你是剧情设计专家，任务是在现有剧情基础上升级冲突，让读者"紧张到不敢眨眼"。

核心要求：
1. 冲突升级必须有明确路径：从表面矛盾→利益冲突→价值观对立→不可调和。
2. 设计多方博弈，不只是主角vs反派，可加入第三方、环境、内心撕裂。
3. 每次升级须制造新的信息差或反转，避免重复同类冲突。
4. 升级强度可控：提供轻度/中度/重度三个梯度方案，分别说明适用场景。

去AI味要求：
- 冲突描述不用"首先...其次...最后"的模板化结构。
- 具体描写对抗场景，有明确动作、反应、后果，不是抽象概括。
- 避免对称排比描述各方立场。
- 不用理性分析替代戏剧性展示。

强阅读吸引力要求：
- 每个冲突升级方案必须包含一个"读者想不到的反转"：以为A是敌人，其实B才是；以为主角赢了，其实落入更大陷阱。
- 冲突必须设计"赌注升级"：不只是输赢，而是输的一方会失去更重要的东西（信任、身份、爱的人、底线）。
- 每次冲突升级要让主角的处境比之前更绝望，但主角的应对让读者感到"爽"或"佩服"。
- 重度冲突方案必须包含"身份反转"或"阵营反转"的设计。

不输出解释，直接输出冲突升级方案。
请使用 Markdown 格式输出，用 # 标注梯度级别，用 **粗体** 强调反转设计，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  foreshadow: `你是擅长布局的网文策划，任务是为剧情设计"读者事后拍案叫绝"的前后呼应伏笔系统。

核心要求：
1. 伏笔须明确：埋设位置、暗示方式（对话/物品/环境/预言）、回收位置。
2. 设计"误导型伏笔"：表面指向A，实际指向B，增强反转效果。
3. 每个伏笔必须与核心剧情或人物命运强相关，拒绝无意义的装饰性伏笔。
4. 标注伏笔当前状态：已埋设/待回收/已回收/已误导。

去AI味要求：
- 伏笔描述不用模板化语言，用具体场景和物品描述。
- 避免对称排比的伏笔设计。
- 不用"显而易见"的暗示，暗示要隐晦但事后合理。

强阅读吸引力要求：
- 每个伏笔必须服务于一次"读者意料之外的反转"，不是简单的前后呼应。
- 设计"双层误导"：表层误导让读者以为是A，中层误导让读者修正为B，实际反转是C。
- 伏笔回收的时机必须选在情绪高点：主角最得意时揭露陷阱，主角最绝望时揭露底牌。
- 至少设计一个"读者以为已经回收，实际上还有第二层"的嵌套伏笔。

不输出解释，直接输出伏笔设计方案。
请使用 Markdown 格式输出，用 # 标注伏笔层级，用 **粗体** 强调反转节点，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  pacing: `你是资深网文编辑，任务是对章节节奏进行诊断和优化，目标是"让读者一章接一章停不下来"。

分析维度：
1. 开篇：是否有强钩子，读者能否在3秒内产生继续阅读的欲望。
2. 中段：信息密度是否合理，是否存在注水段落或过度紧凑导致疲劳。
3. 结尾：是否留下有效悬念，情绪是否停在高点。
4. 整体：冲突分布、对话与描写的比例、段落长度变化节奏。
5. AI味检测：机械过渡词、对称排比、面面俱到、介词开头、总结升华、理性对话。

强阅读吸引力审计：
6. 反转密度：每章是否有足够的意外转折，还是平铺直叙可预测。
7. 钩子分布：章中是否有维持阅读兴趣的小钩子，章末是否有强钩子。
8. 情绪曲线：章节情绪是否有起伏，还是一条直线让读者疲惫。
9. 信息差节奏：是否善用"知道/不知道"的信息差制造持续悬念。

输出要求：
- 先给出总体节奏评分（快/适中/慢/失衡）及原因。
- 再列出具体问题位置和修改建议。
- 不输出套话，每条建议须指向具体文本位置，并说明修改后如何增强阅读吸引力。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  hook: `你是擅长开篇的网文编辑，任务是优化小说开头让读者"看了第一句就必须看完第一章"。

核心要求：
1. 前三句必须有强钩子：冲突前置、悬念抛出、反常识设定或强情绪冲击。
2. 开篇100字内必须出现核心矛盾或主角的核心欲望，拒绝漫长铺垫。
3. 主角须尽快登场并采取行动，避免纯环境描写或背景介绍。
4. 节奏紧凑，信息密度高，每段都推动读者继续读下去。

去AI味要求：
- 不用"在...的世界里""这是一个关于...的故事"等开场白。
- 不用环境描写铺垫，直接从动作或冲突切入。
- 不用对称排比的修辞开头。
- 不用介词结构开头："在...中""当...时"。

强阅读吸引力要求：
- 开篇必须包含一个"读者完全没想到"的元素：主角身份反转、反常识行为、反常场景、意外冲突。
- 前500字内必须让读者产生至少三个疑问：他是谁？为什么会这样？接下来会怎样？
- 第一章结尾必须设计"身份反转"或"阵营反转"的暗示，让读者必须看第二章。

不输出解释，直接输出优化后的开篇正文。
请使用 Markdown 格式输出，用 # 标注章节标题，用 **粗体** 强调钩子句，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,

  blurb: `你是网文包装专家，任务是根据作品设定写出"看到就想点进去"的高转化率简介文案。

核心要求：
1. 简介须包含：核心卖点（一句话勾人）、主角欲望与阻碍、世界规则/金手指、情绪承诺（读者能获得什么爽感）。
2. 前三句必须有强钩子，拒绝平铺直叙的背景介绍。
3. 突出差异化：与同类题材相比，这个作品的核心看点是什么。
4. 生成3个版本：短版（50字内适合平台展示）、中版（150字）、长版（300字带卖点分析）。

去AI味要求：
- 简介不用"在这个世界里""讲述了一个关于..."等套话开头。
- 不用面面俱到地介绍世界观，只抛出最吸引人的1-2个设定。
- 不用对称排比句。
- 不用抽象形容词（"精彩的""跌宕起伏的"），用具体信息替代。
- 结尾不说教、不升华、不感慨。

强阅读吸引力要求：
- 短版简介必须包含一个"身份反转"或"阵营反转"的暗示：让读者意识到主角不是表面那样。
- 中版简介要在第2-3句制造一个"这怎么可能？"的疑问。
- 长版简介要展示"三重爽感"：主角有什么特殊能力（期待感）、主角面对什么不可能的挑战（紧张感）、读者能预判到什么打脸场景（爽感）。
- 每个版本结尾都必须停在悬念点，不要圆满收尾。

不输出解释，直接输出简介文案。
请使用 Markdown 格式输出，用 **粗体** 强调核心卖点和反转暗示，段落间空行分隔。
【语言硬性要求】所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。`,
};

let TOOL_PROMPTS: Record<string, string> = { ...DEFAULT_TOOL_PROMPTS };

// 启动时从数据库加载已修改的提示词，合并到 TOOL_PROMPTS
async function loadToolPromptsFromDB() {
  try {
    const rows = await db.select().from(toolPrompts);
    for (const row of rows) {
      if (DEFAULT_TOOL_PROMPTS[row.toolKey]) {
        TOOL_PROMPTS[row.toolKey] = row.prompt;
      }
    }
    if (rows.length > 0) {
      console.log(`[ai] 已从数据库加载 ${rows.length} 条自定义提示词`);
    }
  } catch (err) {
    // 表可能不存在（首次启动前），忽略错误
    console.warn('[ai] 加载自定义提示词失败（可忽略，首次启动时表可能不存在）:', err);
  }
}
loadToolPromptsFromDB();

const STYLE_PROMPTS: Record<string, string> = {
  creative: `风格：创意发挥型。
核心要求：在保持剧情逻辑自洽的前提下，大胆使用新颖设定、独特视角和出人意料的转折。鼓励打破常规叙事套路，但人物行为必须符合其内在动机。增强画面独特性和想象力密度。

去AI味要求：
- 拒绝机械过渡词和对称排比。
- 拒绝面面俱到和抽象概括，用独特、具体的细节替代通用描述。
- 对话口语化、情绪化，每个角色说话方式截然不同。
- 结尾不总结、不说教、不升华。
- 【语言硬性要求】所有输出必须使用中文（简体）。

强阅读吸引力要求：
- 每200字至少制造一次"读者想不到"的创意转折。
- 善用"反常识设定"：读者熟悉的套路被颠覆，但颠覆后的逻辑自洽且更有趣。
- 强化"信息差"设计：让读者和角色各自掌握不同的关键信息，制造持续悬念。`,

  standard: `风格：标准稳健型。
核心要求：遵循成熟的网文叙事规范，结构清晰，节奏稳定。对话自然，描写准确，不追求标新立异，但保证每一句都有信息价值。适合追求稳定阅读体验的场景。

去AI味要求：
- 删除"然而""与此同时""值得注意的是"等过渡词。
- 打碎对称排比，长短句交错。
- 删除"在...中""当...时"开头的段落。
- 对话口语化，带情绪和口头禅。
- 结尾不总结、不说教。
- 【语言硬性要求】所有输出必须使用中文（简体）。

强阅读吸引力要求：
- 每300字设置一个让读者想继续读的"小钩子"：悬念、冲突、情绪爆发或新信息。
- 保持"展示而非告知"：用动作和反应展示人物状态，不用心理描写直接说明。
- 段落结尾尽量停在信息缺口或情绪高点。`,

  plot: `风格：情节驱动型。
核心要求：一切以推进剧情为核心。每段内容必须包含至少一个情节推进要素（冲突升级、信息揭示、关系变化、悬念加深）。删减一切与当前情节无关的描写和对话，保持高信息密度和快节奏。

去AI味要求：
- 零过渡词：不用"然而""与此同时""总的来说"等连接词，用动作和冲突直接推进。
- 零排比：禁止对称句式，保持粗糙有力的节奏。
- 零铺垫：不用"在...中""当...时"等介词结构拖延，直接切入核心动作。
- 零说教：不总结、不升华、不感慨，剧情本身说话。

强阅读吸引力要求：
- 每150字必须有一个情节推进点：冲突升级、信息反转、关系突变或悬念加深。
- 每500字必须有一次让读者"倒吸一口凉气"的意外转折。
- 善用"三重爽感"：主角得利 + 敌人吃瘪 + 读者意外。
- 结尾永远停在危机爆发或信息揭晓的前一秒。
- 【语言硬性要求】所有输出必须使用中文（简体）。`,
};

// POST /api/ai/chat — 流式SSE
aiRouter.post('/chat', async (c) => {
  const body = await c.req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误' }, 400);
  }

  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const { messages, workId, tool, style, tools: toolNames } = parsed.data;

  // 根据 tool/style 注入 system prompt
  let finalMessages: ChatMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content ?? null,
    tool_calls: m.tool_calls,
    tool_call_id: m.tool_call_id,
    name: m.name,
  }));

  // 如果有 workId，注入作品上下文（最优先，确保人设/世界观/总纲约束被遵守）
  if (workId) {
    const workContext = await buildWorkContextPrompt(workId, userId);
    if (workContext) {
      finalMessages = [{ role: 'system', content: workContext }, ...finalMessages];
    }
  }

  if (tool && TOOL_PROMPTS[tool]) {
    finalMessages = [{ role: 'system', content: TOOL_PROMPTS[tool] }, ...finalMessages];
  }
  if (style && STYLE_PROMPTS[style]) {
    finalMessages = [...finalMessages, { role: 'system', content: STYLE_PROMPTS[style] }];
  }

  // L2 Agent: 把启用的工具白名单转成 OpenAI tool schema
  const tools = getEnabledTools(toolNames);

  try {
    const res = await callLLM(finalMessages, true, modelConfig, tools.length > 0 ? tools : undefined);

    // 注意：完整对话历史（含AI回复）由前端在流结束后通过 POST /api/ai/conversations 保存
    // 此处不做保存，避免存储不完整的历史

    return streamResponse(res);
  } catch (err: any) {
    return c.json({ error: err.message || 'AI调用失败' }, 500);
  }
});

// GET /api/ai/conversations?workId=xxx — 获取对话历史
aiRouter.get('/conversations', async (c) => {
  const userId = c.get('userId');
  const workId = c.req.query('workId');

  const conditions = [eq(aiConversations.userId, userId)];
  if (workId) conditions.push(eq(aiConversations.workId, parseInt(workId)));

  const list = await db.select().from(aiConversations)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions));

  return c.json(list);
});

// POST /api/ai/conversations — 保存/更新对话历史
aiRouter.post('/conversations', async (c) => {
  const userId = c.get('userId');

  const body = await c.req.json();

  if (!body.workId || !Array.isArray(body.messages)) {
    return c.json({ error: '参数错误' }, 400);
  }

  const [existing] = await db.select().from(aiConversations)
    .where(and(eq(aiConversations.userId, userId), eq(aiConversations.workId, body.workId)))
    .limit(1);

  if (existing) {
    await db.update(aiConversations)
      .set({ messages: body.messages })
      .where(eq(aiConversations.id, existing.id));
    return c.json({ id: existing.id, updated: true });
  } else {
    const [result] = await db.insert(aiConversations)
      .values({ userId, workId: body.workId, messages: body.messages })
      .returning();
    return c.json({ id: result.id, created: true });
  }
});

// POST /api/ai/continue — AI续写
aiRouter.post('/continue', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = continueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误' }, 400);
  }

  const { context, style, length, workId, chapterId } = parsed.data;
  const lengthHint = length || '500字左右';
  const styleHint = style || '保持原文风格';

  // 通过 ContextBuilder 获取上下文
  let systemPrompt = TOOL_PROMPTS.continue;
  let userPrompt = `=== 当前章节 ===\n${context}`;

  if (workId) {
    const ctx = await buildContext({
      userId,
      workId,
      chapterId: chapterId || undefined,
      taskType: 'continue',
      currentText: context,
    });
    if (ctx.systemContext) {
      systemPrompt = ctx.systemContext + '\n\n' + systemPrompt;
    }
    if (ctx.userContext) {
      userPrompt = ctx.userContext;
    }
  }
  userPrompt += `\n\n请根据以上内容续写小说正文，${styleHint}，续写长度约${lengthHint}。`;

  // 按模型上下文窗口动态截断
  const contextTokens = modelConfig?.contextTokens || 128000;
  const systemReserve = 500;
  const maxChars = Math.max(3000, Math.floor((contextTokens - systemReserve) * 0.8 / 1.5));
  const totalContext = userPrompt.length;
  if (totalContext > maxChars) {
    // 优先保留当前章，上一章可压缩
    const currentChapterMarker = '=== 当前章节 ===\n';
    const idx = userPrompt.indexOf(currentChapterMarker);
    if (idx !== -1) {
      const currentPart = userPrompt.slice(idx);
      const prevPart = userPrompt.slice(0, idx);
      const remainingBudget = maxChars - currentPart.length;
      if (remainingBudget > 500) {
        userPrompt = prevPart.slice(-remainingBudget) + currentPart;
      } else {
        userPrompt = currentPart;
      }
    } else {
      userPrompt = userPrompt.slice(-maxChars);
    }
  }

  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], stream, modelConfig);

    if (stream) return streamResponse(res);

    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '续写失败' }, 500);
  }
});

// POST /api/ai/polish — AI润色
aiRouter.post('/polish', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = polishSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误' }, 400);
  }

  const { text, style } = parsed.data;
  const styleHint = style || '优化文笔，保持原意';

  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.polish },
      { role: 'user', content: `请对以下文字进行润色，要求：${styleHint}。\n\n${text}` },
    ], stream, modelConfig);

    if (stream) return streamResponse(res);

    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '润色失败' }, 500);
  }
});

// POST /api/ai/outline — 生成总纲
aiRouter.post('/outline', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = outlineSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误' }, 400);
  }

  const { theme, genre, chapters } = parsed.data;

  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.outline },
      { role: 'user', content: `基于题材「${genre || '未指定'}」、主题「${theme}」，生成共${chapters}章的小说总纲。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);

    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '大纲生成失败' }, 500);
  }
});

// === 新增AI工具路由 ===

const expandSchema = z.object({
  text: z.string().min(1),
  style: z.string().optional(),
});

const characterSchema = z.object({
  genre: z.string().optional(),
  role: z.string().min(1),
  context: z.string().optional(),
});

const chapterOutlineSchema = z.object({
  outline: z.string().min(1),
  volume: z.string().optional(),
  count: z.number().optional().default(10),
});

const inspirationSchema = z.object({
  problem: z.string().min(1),
  context: z.string().optional(),
});

const fuseInspirationsSchema = z.object({
  inspirations: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })).min(2).max(5),
});

const titlesSchema = z.object({
  content: z.string().min(1),
  style: z.string().optional(),
});

const rewriteSchema = z.object({
  text: z.string().min(1),
  targetStyle: z.string().optional(),
});

const detectSchema = z.object({
  text: z.string().min(1),
});

// POST /api/ai/expand — 句子扩写
aiRouter.post('/expand', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = expandSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { text, style } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.expand },
      { role: 'user', content: `将以下文本扩写为更完整的小说段落。${style ? `风格要求：${style}` : ''}\n\n${text}` },
    ], stream, modelConfig);

    if (stream) return streamResponse(res);

    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '扩写失败' }, 500);
  }
});

// POST /api/ai/character — 角色生成
aiRouter.post('/character', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = characterSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { genre, role, context } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.character },
      { role: 'user', content: `根据题材「${genre || '未指定'}」、角色定位「${role}」${context ? `、背景设定「${context}」` : ''}，生成角色设定卡。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '角色生成失败' }, 500);
  }
});

// POST /api/ai/chapter-outline — 章纲生成
aiRouter.post('/chapter-outline', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = chapterOutlineSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { outline, volume, count } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS['chapter-outline'] },
      { role: 'user', content: `根据以下总纲，生成连续${count}章的章纲${volume ? `（${volume}）` : ''}：\n\n${outline}` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '章纲生成失败' }, 500);
  }
});

// POST /api/ai/inspiration — 灵感生成
aiRouter.post('/inspiration', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = inspirationSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { problem, context } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.inspiration },
      { role: 'user', content: `问题：${problem}${context ? `\n当前剧情背景：${context}` : ''}` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '灵感生成失败' }, 500);
  }
});

// POST /api/ai/fuse-inspirations — 热梗融合
aiRouter.post('/fuse-inspirations', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = fuseInspirationsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误：至少选择2个灵感，最多5个' }, 400);

  const { inspirations } = parsed.data;
  const inspirationText = inspirations.map((insp, i) =>
    `【灵感${i + 1}】${insp.title}\n${insp.content}`
  ).join('\n\n');

  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.fuseInspirations },
      { role: 'user', content: `请将以下${inspirations.length}个灵感进行深度融合，创造一个有化学反应的全新作品创意：\n\n${inspirationText}` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '热梗融合失败' }, 500);
  }
});

// POST /api/ai/titles — 标题生成
aiRouter.post('/titles', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = titlesSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { content, style } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.titles },
      { role: 'user', content: `根据以下内容生成标题${style ? `，偏${style}风格` : ''}：\n\n${content}` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '标题生成失败' }, 500);
  }
});

// POST /api/ai/rewrite — AI改写
aiRouter.post('/rewrite', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = rewriteSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { text, targetStyle } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.rewrite },
      { role: 'user', content: `将以下文本改写为${targetStyle || '更流畅自然'}的风格。\n\n${text}` },
    ], stream, modelConfig);

    if (stream) return streamResponse(res);

    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '改写失败' }, 500);
  }
});

// POST /api/ai/detect — AI纠错（全维度深度审计）
aiRouter.post('/detect', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = detectSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { text } = parsed.data;

  // 字数校验
  const plainText = text.replace(/<[^>]+>/g, '').trim();
  if (plainText.length < 100) {
    return c.json({ error: '内容大于100字才可使用AI纠错功能', needMore: true, currentLength: plainText.length }, 400);
  }

  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.detect },
      { role: 'user', content: `请对以下文本进行全维度深度审计：\n\n${text}` },
    ], stream, modelConfig);

    if (stream) return streamResponse(res);

    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '检测失败' }, 500);
  }
});

// === 去AI味 ===

const deAiSchema = z.object({
  text: z.string().min(1),
});

// POST /api/ai/de-ai — 去AI味
aiRouter.post('/de-ai', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = deAiSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { text } = parsed.data;

  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS['de-ai'] },
      { role: 'user', content: `请重写以下内容以去除AI味：\n\n${text}` },
    ], stream, modelConfig);

    if (stream) return streamResponse(res);

    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '去AI味失败' }, 500);
  }
});

// === 新增工具路由 ===

const sceneSchema = z.object({ scene: z.string().min(1), mood: z.string().optional(), style: z.string().optional() });
const dialogueSchema = z.object({ characters: z.string().min(1), context: z.string().optional(), tone: z.string().optional() });
const conflictSchema = z.object({ context: z.string().min(1), level: z.string().optional() });
const foreshadowSchema = z.object({ context: z.string().min(1), target: z.string().optional() });
const pacingSchema = z.object({ text: z.string().min(1) });
const hookSchema = z.object({ opening: z.string().min(1), genre: z.string().optional() });
const blurbSchema = z.object({ outline: z.string().min(1), genre: z.string().optional() });

aiRouter.post('/scene', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = sceneSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);
  const { scene, mood, style } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.scene },
      { role: 'user', content: `生成以下场景的描写：${scene}${mood ? `\n氛围要求：${mood}` : ''}${style ? `\n风格要求：${style}` : ''}\n\n直接输出描写内容，不要添加额外说明。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '场景描写生成失败' }, 500);
  }
});

aiRouter.post('/dialogue', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = dialogueSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);
  const { characters, context, tone } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.dialogue },
      { role: 'user', content: `为以下角色生成对话：${characters}${context ? `\n场景背景：${context}` : ''}${tone ? `\n对话基调：${tone}` : ''}\n\n直接输出对话内容，不要添加额外说明。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '对话生成失败' }, 500);
  }
});

aiRouter.post('/conflict', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = conflictSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);
  const { context, level } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.conflict },
      { role: 'user', content: `为以下剧情设计冲突升级方案：\n${context}${level ? `\n升级强度：${level}` : ''}\n\n直接输出方案，不要添加额外说明。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '冲突升级设计失败' }, 500);
  }
});

aiRouter.post('/foreshadow', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = foreshadowSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);
  const { context, target } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.foreshadow },
      { role: 'user', content: `为以下剧情设计伏笔：\n${context}${target ? `\n需要铺垫的目标事件：${target}` : ''}\n\n直接输出伏笔设计方案，不要添加额外说明。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '伏笔设计失败' }, 500);
  }
});

aiRouter.post('/pacing', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = pacingSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);
  const { text } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.pacing },
      { role: 'user', content: `分析以下文本的章节节奏：\n\n${text}\n\n直接输出分析报告和修改建议，不要添加额外说明。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '节奏分析失败' }, 500);
  }
});

aiRouter.post('/hook', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = hookSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);
  const { opening, genre } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.hook },
      { role: 'user', content: `优化以下小说开头，提升留存率：\n\n${opening}${genre ? `\n题材：${genre}` : ''}\n\n直接输出优化后的开篇内容，不要添加额外说明。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '开篇优化失败' }, 500);
  }
});

aiRouter.post('/blurb', async (c) => {
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = blurbSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);
  const { outline, genre } = parsed.data;
  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: TOOL_PROMPTS.blurb },
      { role: 'user', content: `根据以下内容生成吸引人的作品简介：\n\n${outline}${genre ? `\n题材：${genre}` : ''}\n\n直接输出简介文案，不要添加额外说明。` },
    ], stream, modelConfig);
    if (stream) return streamResponse(res);
    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '简介生成失败' }, 500);
  }
});

// 工具名称映射（用于语义匹配）
const TOOL_NAME_MAP: Record<string, string> = {
  'continue': '续写（继续写后面的内容）',
  'polish': '润色（让文字更流畅、更有感染力）',
  'expand': '扩写（扩展内容长度、丰富细节）',
  'rewrite': '改写（改变写法或叙事风格）',
  'de-ai': '去AI味（让文字更像真人写的）',
  'scene': '场景描写（环境、氛围、画面感）',
  'dialogue': '对话生成（人物对白、台词）',
  'character': '角色生成（人设、角色设定、角色档案）',
  'outline': '大纲生成（故事骨架、总纲、整体结构）',
  'chapter-outline': '章纲生成（单章结构、章节目录）',
  'inspiration': '灵感生成（创意、点子、脑洞）',
  'conflict': '冲突升级（矛盾激化、对抗升级）',
  'foreshadow': '伏笔设计（前后呼应、草蛇灰线）',
  'detect': 'AI检测与纠错（审稿、点评、检查问题）',
  'pacing': '节奏分析（快慢、紧凑、拖沓诊断）',
  'hook': '开篇钩子（开头优化、吸引读者）',
  'titles': '标题生成（书名、章节名、起名）',
  'blurb': '简介文案（推荐语、作品简介）',
};

const toolMatchSchema = z.object({
  text: z.string().min(1),
  modelId: z.number().optional(),
});

// POST /api/ai/tool-match — AI语义工具匹配
aiRouter.post('/tool-match', async (c) => {
  const body = await c.req.json();
  const parsed = toolMatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误' }, 400);
  }

  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const { text } = parsed.data;

  const toolList = Object.entries(TOOL_NAME_MAP)
    .map(([id, desc]) => `- ${id}: ${desc}`)
    .join('\n');

  const prompt = `你是网文写作平台的智能助手。请根据用户的输入，判断用户最想要使用哪个写作工具。

可选工具列表：
${toolList}

用户输入："""${text}"""

规则：
1. 只从上面的工具列表中选择最匹配的一个
2. 如果用户意图不明确或只是闲聊，返回 "default"
3. 必须返回纯JSON，不要包含任何解释、markdown格式或其他文字

返回格式：{"tool":"工具ID","confidence":0.0到1.0之间的数字}`;

  try {
    const res = await callLLM(
      [{ role: 'user', content: prompt }],
      false,
      modelConfig,
    );

    const content = await extractContent(res);

    // 解析JSON
    let result: { tool: string; confidence: number } = { tool: 'default', confidence: 0 };
    try {
      const clean = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.tool && typeof parsed.tool === 'string') {
        result.tool = parsed.tool;
      }
      if (typeof parsed.confidence === 'number') {
        result.confidence = Math.max(0, Math.min(1, parsed.confidence));
      }
    } catch {
      // JSON解析失败，尝试正则提取
      const match = content.match(/"tool"\s*:\s*"([^"]+)"/);
      if (match) result.tool = match[1];
      const confMatch = content.match(/"confidence"\s*:\s*(0?\.\d+|1\.0|1)/);
      if (confMatch) result.confidence = parseFloat(confMatch[1]);
    }

    // 验证tool是否有效
    if (result.tool !== 'default' && !TOOL_PROMPTS[result.tool]) {
      result.tool = 'default';
      result.confidence = 0;
    }

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || '语义匹配失败' }, 500);
  }
});

// ========== 提示词调试路由 ==========

// GET /api/ai/tool-prompts — 获取所有工具提示词
aiRouter.get('/tool-prompts', (c) => {
  const list = Object.entries(TOOL_PROMPTS).map(([key, prompt]) => ({
    key,
    prompt,
    defaultPrompt: DEFAULT_TOOL_PROMPTS[key] || '',
    isModified: prompt !== (DEFAULT_TOOL_PROMPTS[key] || ''),
  }));
  return c.json({ items: list });
});

// GET /api/ai/tool-prompts/:tool — 获取单个工具提示词
aiRouter.get('/tool-prompts/:tool', (c) => {
  const tool = c.req.param('tool');
  if (!TOOL_PROMPTS[tool]) {
    return c.json({ error: '工具不存在' }, 404);
  }
  return c.json({
    key: tool,
    prompt: TOOL_PROMPTS[tool],
    defaultPrompt: DEFAULT_TOOL_PROMPTS[tool] || '',
    isModified: TOOL_PROMPTS[tool] !== (DEFAULT_TOOL_PROMPTS[tool] || ''),
  });
});

const updatePromptSchema = z.object({
  prompt: z.string().min(1),
});

// PUT /api/ai/tool-prompts/:tool — 更新单个工具提示词（内存 + 数据库持久化）
aiRouter.put('/tool-prompts/:tool', async (c) => {
  const tool = c.req.param('tool');
  if (!DEFAULT_TOOL_PROMPTS[tool]) {
    return c.json({ error: '工具不存在' }, 404);
  }

  const body = await c.req.json();
  const parsed = updatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: prompt 不能为空' }, 400);
  }

  TOOL_PROMPTS[tool] = parsed.data.prompt;

  // 持久化到数据库（upsert）
  try {
    const existing = await db.select().from(toolPrompts).where(eq(toolPrompts.toolKey, tool)).limit(1);
    if (existing.length > 0) {
      await db.update(toolPrompts).set({ prompt: parsed.data.prompt, updatedAt: new Date() }).where(eq(toolPrompts.toolKey, tool));
    } else {
      await db.insert(toolPrompts).values({ toolKey: tool, prompt: parsed.data.prompt });
    }
  } catch (err) {
    console.warn(`[ai] 持久化提示词 ${tool} 失败:`, err);
  }

  return c.json({
    key: tool,
    prompt: TOOL_PROMPTS[tool],
    isModified: TOOL_PROMPTS[tool] !== DEFAULT_TOOL_PROMPTS[tool],
  });
});

const testPromptSchema = z.object({
  prompt: z.string().min(1),
  input: z.string().min(1),
  stream: z.boolean().optional().default(false),
});

// POST /api/ai/tool-prompts/:tool/test — 测试自定义提示词
aiRouter.post('/tool-prompts/:tool/test', async (c) => {
  const tool = c.req.param('tool');
  const body = await c.req.json();
  const userId = c.get('userId');
  const modelConfig = await resolveModelConfig(userId, body.modelId);
  const parsed = testPromptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误' }, 400);
  }

  const { prompt, input, stream } = parsed.data;

  try {
    const stream = body.stream === true;
    const res = await callLLM([
      { role: 'system', content: prompt },
      { role: 'user', content: input },
    ], stream);

    if (stream) return streamResponse(res);

    return c.json({ content: await extractContent(res) });
  } catch (err: any) {
    return c.json({ error: err.message || '测试失败' }, 500);
  }
});

// POST /api/ai/tool-prompts/:tool/reset — 重置单个工具提示词到默认（内存 + 数据库）
aiRouter.post('/tool-prompts/:tool/reset', async (c) => {
  const tool = c.req.param('tool');
  if (!DEFAULT_TOOL_PROMPTS[tool]) {
    return c.json({ error: '工具不存在' }, 404);
  }
  TOOL_PROMPTS[tool] = DEFAULT_TOOL_PROMPTS[tool];
  // 从数据库删除自定义记录
  try {
    await db.delete(toolPrompts).where(eq(toolPrompts.toolKey, tool));
  } catch (err) {
    console.warn(`[ai] 删除自定义提示词 ${tool} 失败:`, err);
  }
  return c.json({
    key: tool,
    prompt: TOOL_PROMPTS[tool],
    isModified: false,
  });
});

// POST /api/ai/tool-prompts/reset — 重置所有工具提示词到默认（内存 + 数据库）
aiRouter.post('/tool-prompts/reset', async (c) => {
  TOOL_PROMPTS = { ...DEFAULT_TOOL_PROMPTS };
  // 清空数据库中的所有自定义提示词
  try {
    await db.delete(toolPrompts);
  } catch (err) {
    console.warn('[ai] 清空自定义提示词失败:', err);
  }
  return c.json({ success: true, message: '所有提示词已恢复默认' });
});

// POST /api/ai/tools/:name — 执行后端工具（前端在 runChatWithTools 里调用）
aiRouter.post('/tools/:name', async (c) => {
  const userId = c.get('userId');
  const name = c.req.param('name');
  const body = await c.req.json().catch(() => ({}));
  const args = body.args || {};

  const toolDef = getTool(name);
  if (!toolDef) {
    return c.json({ error: '未知工具' }, 404);
  }
  if (toolDef.execution !== 'backend' || !toolDef.handler) {
    return c.json({ error: '该工具不支持后端执行' }, 400);
  }

  const workId = body.workId ? Number(body.workId) : undefined;
  try {
    const result = await toolDef.handler(args, { userId, workId });
    return c.json({ ok: true, result });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message || '工具执行失败' }, 500);
  }
});

export { TOOL_PROMPTS, DEFAULT_TOOL_PROMPTS, STYLE_PROMPTS };
export default aiRouter;
