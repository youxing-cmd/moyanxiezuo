// mock-llm.ts — 为 Agent E2E 测试提供不依赖真实 API 的 LLM 响应
// 通过 process.env.MOCK_LLM=true 启用

import type { ChatMessage } from '../../services/llm.js';

function buildResponse(content: string, stream = false): Response {
  const data = {
    id: 'mock-chatcmpl',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'mock-model',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
  };

  if (stream) {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ id: data.id, object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content } }] })}\n\n`),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
  }

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function detectIntent(messages: ChatMessage[]): string {
  const lastUser = messages.filter((m) => m.role === 'user').pop()?.content || '';
  const system = messages.find((m) => m.role === 'system')?.content || '';

  // Planner
  if (system.includes('任务规划器') || system.includes('规划器')) return 'planner';
  if (lastUser.includes('拆成可执行的 task DAG')) return 'planner';

  // generate_ideas
  if (system.includes('创意生成') || system.includes('题材方向')) return 'generate_ideas';
  if (lastUser.includes('题材方向')) return 'generate_ideas';

  // draft_outline
  if (system.includes('大纲设计') || lastUser.includes('小说总纲')) return 'draft_outline';

  // write_chunk
  if (system.includes('续写') || system.includes('正文') || lastUser.includes('续写')) return 'write_chunk';

  // self_review
  if (system.includes('自检') || system.includes('审查')) return 'self_review';

  // polish
  if (system.includes('润色') || lastUser.includes('润色')) return 'polish';

  // read_context fallback
  return 'chat';
}

const MOCK_PLAN = {
  title: '参考《雪中悍刀行》写一篇 3000 字短篇爆款',
  estimatedDuration: '约 15 分钟',
  estimatedCost: '约 6 次 LLM 调用',
  steps: [
    { id: '1', type: 'read_context', title: '读取作品设定', dependsOn: [] },
    { id: '2', type: 'web_research', title: '研究《雪中悍刀行》风格', dependsOn: [] },
    { id: '3', type: 'generate_ideas', title: '生成 3 个题材方向', dependsOn: ['1', '2'] },
    { id: '4', type: 'user_input', title: '等你选择', dependsOn: ['3'] },
    { id: '5', type: 'draft_outline', title: '生成大纲', dependsOn: ['4'] },
    { id: '6', type: 'write_chunk', title: '写开篇 1000 字', dependsOn: ['5'] },
    { id: '7', type: 'write_chunk', title: '写中段 1200 字', dependsOn: ['6'] },
    { id: '8', type: 'write_chunk', title: '写结尾 800 字', dependsOn: ['7'] },
    { id: '9', type: 'self_review', title: '编辑自检', dependsOn: ['8'] },
    { id: '10', type: 'polish', title: '优化文风', dependsOn: ['9'] },
    { id: '11', type: 'create_artifact', title: '保存产物', dependsOn: ['10'], input: { type: 'chapter_draft' } },
  ],
};

const MOCK_IDEAS = `# 3 个差异化题材方向

---

## 方向一：《我在乱世当纨绔》
**核心梗**：废物皇子人设崩塌流
**爽点设计**：表面草包实为绝世强者，"装"与"露"的节奏拿捏
**目标读者**：男频玄幻爱好者

## 方向二：《北凉账房先生》
**核心梗**：替徐骁算了二十年死账的老账房
**爽点设计**：以旁观者视角见证王朝兴衰，藏龙卧虎
**目标读者**：历史架空爱好者

## 方向三：《雪中剑客行》
**核心梗**：一剑霜寒十四州的孤剑客
**爽点设计**：以武入道，一人一剑挑战整座江湖
**目标读者**：武侠/仙侠爱好者`;

const MOCK_OUTLINE = `# 《我在乱世当纨绔》总纲

## 第一幕：废物皇子
- 天下皆知的草包纨绔，烂泥扶不上墙
- 开篇即被皇室除名，逐出帝都

## 第二幕：暗藏锋芒
- 流落民间，偶然展露真实实力
- 以一己之力击退敌军先锋

## 第三幕：真相大白
- 二十年隐忍只为今日
- 单枪匹马杀回皇城，夺回属于自己的一切

## 核心爽点
1. 装废物的反差感
2. 身份揭露的爆发力
3. 以弱胜强的战斗场面`;

const MOCK_CHUNK_1 = `夜色如墨，少年独自站在城楼之上。

风卷着沙砾拍打在脸上，他却一动不动，仿佛一尊雕塑。三天前，他还是大周朝最显赫的九皇子；三天后，他成了天下最大的笑话——被父皇亲手除名，逐出皇室，连姓氏都被剥夺。

"废物。"他轻轻吐出这两个字，嘴角却勾起一抹意味不明的笑。

没有人知道，这二十年来的装疯卖傻，只是为了等一个人。等那个害死母妃的幕后黑手，主动露出马脚。

远处传来马蹄声。少年眯起眼睛，手指轻轻摩挲着腰间那把从不离身的破铁剑。剑鞘锈迹斑斑，剑柄缠着褪色的布条——任谁看了，都会以为这是从垃圾堆里捡来的废品。

但只有他自己知道，这把剑曾经斩过什么。

三百里外，北凉王府。

老账房徐伯放下手中的毛笔，望向窗外漆黑的夜空。他算了二十年的账，却从没算到，那个被天下人耻笑的废物皇子，会在今夜掀起怎样的风浪。

"来了。"他轻声说。

窗外，一道剑光划破长空。`;

const MOCK_CHUNK_2 = `剑光落下时，北凉王府的侍卫甚至来不及拔刀。

不是他们太慢，而是那道剑实在太快。快得像是一道闪电劈开了夜幕，快得像是一场来不及躲避的梦。

徐伯站在廊下，手中的账本被劲风吹得哗哗作响。他没有躲，只是静静地看着那个从夜空中落下的少年——衣衫褴褛，满身尘土，腰间还挂着那把人人嘲笑的破铁剑。

"九殿下。"徐伯微微躬身，声音平静得像是在问候一个寻常的客人。

少年落地，剑尖斜指地面，一滴血顺着剑刃滑落，在青石板上绽开一朵暗红的花。

"徐伯。"少年开口，声音沙哑却沉稳，"二十年了，你还在替他算账？"

徐伯直起身，眼中闪过一丝复杂的光芒。他当然知道少年口中的"他"是谁——那个坐在龙椅上，亲手将亲子除名的男人。

"账，总是要算的。"徐伯缓缓道，"只是有些账，用算盘算不清。"

少年笑了。这是他三天来第一次笑，笑容里没有半分温度，只有一种令人心悸的锋芒。

"那就用剑算。"他说。

话音未落，王府外突然传来震天的喊杀声。少年眉头微皱，目光投向远方——那里，黑压压的军队正在逼近，旌旗上绣着一个"周"字。

"来得真快。"徐伯叹了口气，"陛下还是不放心你。"

"他不是不放心我。"少年握紧了剑柄，指节因用力而泛白，"他是怕我发现，母妃当年是怎么死的。"

破铁剑缓缓出鞘。

没有想象中的龙吟虎啸，只有一声低沉的嗡鸣，像是某种沉睡了千年的巨兽终于睁开了眼睛。

徐伯瞳孔骤缩。

他见过无数名剑——北凉的寒霜、南疆的赤焰、东海的沧浪——但没有一把，比眼前这把锈迹斑斑的破铁剑更让他感到恐惧。

因为那把剑上，有死气。

不是杀过人的死气，而是斩过命、断过运、逆转过天机的死气。

"你到底是谁？"徐伯的声音第一次出现了颤抖。

少年没有回答。他提着剑，迎着千军万马，一步一步向前走去。

月光洒在他瘦削的背影上，拉出一道长长的影子。那影子不像人，更像一把出鞘的剑。

"我说过。"少年的声音随风传来，"我要用剑，把这笔账算清楚。"`;

const MOCK_CHUNK_3 = `皇城之上，龙椅之上。

皇帝看着跪在地上的探子，手中的茶盏微微颤抖。

"你说什么？"他的声音很轻，轻得像是在问一件微不足道的小事，"三千禁军，挡不住一个人？"

探子额头抵着冰冷的地面，汗水浸湿了衣襟。他想说自己没有说谎，想说自己亲眼看到那道剑光如何撕裂军阵，想说自己亲耳听到那三千人的哀嚎——但他一个字都说不出来。

因为喉咙已经被恐惧扼住了。

"废物。"皇帝放下茶盏，瓷器与紫檀木相碰，发出清脆的声响。"都是废物。"

殿外突然安静了。

不是那种风声停息、鸟鸣消散的安静，而是某种更可怕的安静——仿佛天地间所有的声音都被一剑斩断，只留下死寂。

皇帝猛地站起身。

殿门无声无息地裂成两半，像是被某种无形的力量从中剖开。月光倾泻而入，照亮了站在门口的那个人。

瘦削、褴褛、沉默。

腰间挂着一把破铁剑。

"你……"皇帝张了张嘴，却发现自己的声音嘶哑得不像话。

少年抬起头，目光平静得像是一潭死水。

"父皇。"他说，"我来算账了。"

破铁剑缓缓出鞘。

这一次，整个皇城都听到了那声剑鸣。

不是龙吟，不是虎啸，而是一种更深沉、更古老的声音——像是命运本身在被斩断时发出的叹息。

皇帝跌回龙椅，脸色惨白如纸。

他终于明白，自己二十年前除掉的，从来不是一个废物皇子。

而是一把，他根本没有资格拔出的剑。

剑光落下。

月光黯淡了一瞬，随即重新洒满大地。

皇城依旧巍峨，龙椅依旧冰冷，只是换了一个坐在上面的人。

少年收起剑，转身离去。他没有杀皇帝——不是因为心软，而是因为有些账，活着算才更有意思。

身后，徐伯从阴影中走出，手中捧着一摞厚厚的账本。

"殿下，"他躬身道，"这些账，您还要算吗？"

少年停下脚步，回头看了他一眼。

"算。"他说，"但不是用剑。"

他伸出手，接过账本，动作轻柔得像是在接过什么珍贵的东西。

"用这里算。"他指了指自己的脑袋，嘴角浮现出一丝真正的笑意。

徐伯愣了一下，随即也笑了。

他终于明白，这个少年最可怕的地方，从来都不是那把剑。

而是他明明可以用剑解决一切，却偏要选择更难的活法。

这样的对手，才最值得尊敬。

月光下，两道身影一前一后，消失在皇城的尽头。

属于他们的故事，才刚刚开始。`;

const MOCK_REVIEW = `# 自检报告

## 各维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 情节连贯性 | 8/10 | 三幕结构清晰，起承转合完整 |
| 角色一致性 | 7/10 | 主角"隐忍-爆发"弧光稳定 |
| 爽点/钩子密度 | 9/10 | 每段都有信息差反转，钩子密集 |
| 文风稳定性 | 7/10 | 保持古风叙事节奏，句式有韵律 |
| 与总纲契合度 | 8/10 | 覆盖大纲所有关键节点 |

## 总体评价

总体评分 7.8/10，通过。

优点：反差人设执行到位，战斗场面有画面感，结尾留有余韵。
建议：中段可增加一个配角互动，丰富情感层次。`;

const MOCK_POLISH = `夜色如墨，少年独自立于城楼之上。

狂风卷着沙砾抽打面颊，他却岿然不动，恍若一尊亘古的雕塑。三日之前，他还是大周朝最显赫的九皇子；三日之后，他成了天下最大的笑柄——被父皇亲手削去名籍，逐出宗室，连姓氏都被一笔勾销。

"废物。"他轻轻吐出这两个字，唇角却勾起一抹意味不明的弧度。

无人知晓，这二十年来的疯癫痴傻，只为等一人。等那个害死母妃的幕后黑手，主动现出原形。

远处传来雷鸣般的马蹄声。少年眯起眼眸，指尖缓缓摩挲着腰间那把从不离身的破铁剑。剑鞘锈迹斑驳，剑柄缠着褪色的布条——任谁看了，都道这是从垃圾堆里捡来的废铁。

可唯有他自己清楚，这把剑曾斩过什么。

三百里外，北凉王府。

老账房徐伯搁下手中的狼毫，望向窗外漆黑的夜幕。他算了二十年的账，却从未算到，那个被天下人耻笑的废物皇子，会在今夜掀起何等风浪。

"来了。"他低声呢喃。

窗外，一道剑光撕裂长空。`;

export function getMockLLMResponse(messages: ChatMessage[], stream = false): Response {
  const intent = detectIntent(messages);

  switch (intent) {
    case 'planner':
      return buildResponse(JSON.stringify(MOCK_PLAN), stream);
    case 'generate_ideas':
      return buildResponse(MOCK_IDEAS, stream);
    case 'draft_outline':
      return buildResponse(MOCK_OUTLINE, stream);
    case 'write_chunk': {
      const user = messages.filter((m) => m.role === 'user').pop()?.content || '';
      if (user.includes('开篇') || user.includes('第一部分')) return buildResponse(MOCK_CHUNK_1, stream);
      if (user.includes('中段') || user.includes('第二部分')) return buildResponse(MOCK_CHUNK_2, stream);
      return buildResponse(MOCK_CHUNK_3, stream);
    }
    case 'self_review':
      return buildResponse(MOCK_REVIEW, stream);
    case 'polish':
      return buildResponse(MOCK_POLISH, stream);
    default:
      return buildResponse('Mock 响应：未识别意图，但任务继续。', stream);
  }
}
