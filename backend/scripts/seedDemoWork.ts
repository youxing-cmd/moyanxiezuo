// 种子数据脚本（仅供开发，不应在生产环境运行）
// 用法：npx tsx scripts/seedDemoWork.ts <userId>
// 例如：npx tsx scripts/seedDemoWork.ts 1
//
// 作用：为指定用户插入一个 5 章示例作品，触发摘要和风格 DNA 生成
// 用途：验证记忆面板、续写上下文拼接、/recall 等功能在"已有作品"场景下的真实效果

import 'dotenv/config';
import { db } from '../src/db/index.js';
import { works, chapters, characters, outlines, chapterSummaries, workStyleDNA } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { generateChapterSummary } from '../src/services/chapterSummary.js';
import { generateAndSaveStyleDNA } from '../src/services/styleDNA.js';

const DEMO_CHAPTERS = [
  {
    title: '第一章 山门初见',
    content: `林青云背着布囊，站在青云宗的山门下。

他出身寒微，灵根资质平庸，能站在这里全靠三年苦修攒下的一点底子。

"这位道友，进山门需先通过灵根测试。"守门弟子打量了他一眼，语气淡淡。

林青云点头，按照吩咐将手按在测灵石上。石头亮起一抹微弱的青光，颜色暗淡得几乎可见底。

"杂灵根，下品。"守门弟子失了兴趣，挥手让他通过。

林青云握紧了布囊里那本来历不明的残卷。三年前他在山脚捡到这本书时，根本看不懂上面的文字。直到去年的某个雨夜，他才发现这残卷的真正秘密。

"修仙路漫漫，"他低声道，"我林青云，未必输给这些天之骄子。"

山门内，一道身影正冷眼旁观这一切。那是个青衣女子，眉宇间隐有锋芒。她看着林青云走过山门，若有所思。`,
  },
  {
    title: '第二章 残卷之秘',
    content: `林青云被分到了外门最偏的丙字院。

他的住处简陋，只有一张木床、一张破桌。但他不在乎，他只在乎能否找一处清静地方修炼那本残卷。

夜深人静时，他取出残卷。月光照在书页上，那些原本模糊的文字渐渐清晰起来。

《九天玄功》——这是残卷的真名。

"心法第一层：聚气于丹田，导引于经脉。"林青云盘膝而坐，按照心法运转。一缕微弱的灵气从天地间汇聚而来，钻入他的身体。

奇异的事发生了。他的杂灵根在心法运转下，竟开始细微地变化。每条灵根都被一种说不清的力量梳理着，变得纯净。

"这就是残卷的秘密……"他眼中闪过精芒，"它能改造灵根！"

他不知道的是，远在千里之外的青云宗藏经阁深处，一位白发老者忽然睁开眼。

"那本残卷……出世了？"`,
  },
  {
    title: '第三章 师兄刁难',
    content: `第二天的杂役，林青云被分到了药园除草。

药园里早已有几人在干活。其中一个高个少年走过来，斜眼看他：

"新来的？我是李存志，外门十二期师兄。规矩懂吗？"

林青云摇头。

"哼，那我教你。每月你要交我五块灵石，否则——"李存志冷笑，"在这青云宗，没人罩着的废物活不下去。"

林青云沉默了片刻，平静地说：

"我没有灵石。"

"那就找！"李存志一脚踹翻药篓，里面的草药撒了一地，"今天的活你重做，明天日落前不交灵石，等着断手断脚吧。"

李存志带着两个跟班大笑而去。林青云蹲下身，慢慢拾起散落的药草。

他没有动怒。修仙之路，区区一个李存志算不得什么。

但他在心里默默记下了这个名字。

远处的回廊上，那个青衣女子又出现了。她看着林青云隐忍不发的样子，唇角微微一勾。`,
  },
  {
    title: '第四章 灵根突变',
    content: `三个月后。

林青云依旧在药园干着最累的活，依旧每月被李存志勒索（用各种方法借来的灵石）。

但他的修为，已悄然突破。

练气期三层圆满——这是连许多天才弟子都需要半年才能达到的境界。而他，三个月。

更重要的是，他的灵根在残卷的不断改造下，已经从杂灵根变成了纯净的水灵根。

"水灵根中品。"他望着自己的测灵结果，心中波澜不惊。

这意味着，他在青云宗的待遇即将彻底改变。

但他没有声张。他知道，藏拙比炫耀更重要。

就在这天傍晚，李存志又来了。这次他身后多了一个陌生的师兄，一脸阴鸷。

"听说你最近修为涨得很快？"李存志冷笑，"既然如此，灵石的数额也该涨涨了。从今天起，每月十块灵石。"

林青云抬头看他。这一刻，他眼中那一丝隐忍消失了。

"够了。"`,
  },
  {
    title: '第五章 锋芒初露',
    content: `"够了？"李存志愣了一下，旋即大怒，"小子，你想造反？！"

林青云没回答。他向前迈了一步。

李存志身边的阴鸷师兄低喝一声，一掌拍来。这一掌带着练气期六层的威压，本该让林青云毫无还手之力。

可下一刻，那师兄的脸色就变了。

林青云的手指轻轻一点，一道水属性的灵气化作利箭，瞬间穿透了对方的护体灵气，钉在那师兄的肩膀上！

血溅三尺。

"你……你是练气期几层？"阴鸷师兄踉跄后退，难以置信。

林青云眼神平静：

"五层。"

李存志的脸彻底白了。一个出身寒微的废物，三个月修到练气期五层，还能轻松打伤六层修士——这绝不可能！

"你到底是什么人？"

林青云没回答，目光越过李存志，看向回廊上那个青衣女子的方向。

她不知何时已经站在那里，眼中带着审视。

"看来，"她轻声道，"是时候和你正式谈谈了。"`,
  },
];

async function main() {
  const userId = parseInt(process.argv[2] || '');
  if (!userId || isNaN(userId)) {
    console.error('用法: npx tsx scripts/seedDemoWork.ts <userId>');
    process.exit(1);
  }

  console.log(`[seed] 为 user ${userId} 创建示例作品...`);

  // 1. 创建作品
  const [work] = await db.insert(works).values({
    userId,
    title: '【DEMO】仙途漫漫',
    genre: '玄幻修真',
    channel: 'male',
    perspective: 'third',
    intro: '种子数据：用于测试记忆面板、续写上下文、/recall 等功能',
    tags: ['DEMO', '修仙', '寒门崛起'],
    emoji: '⚔️',
  }).returning();
  console.log(`[seed] 创建作品 id=${work.id}`);

  // 2. 创建总纲
  await db.insert(outlines).values({
    workId: work.id,
    title: '总纲',
    content: '主角林青云出身寒门，靠捡到的残卷《九天玄功》改造灵根崛起。第一卷主线：青云宗外门历练，初露锋芒，结识青衣女子（其实是宗门长老亲传弟子苏婉清）。第二卷：内门大比，与李存志背后的势力正面冲突。',
  });

  // 3. 创建角色
  await db.insert(characters).values([
    { workId: work.id, name: '林青云', role: 'protagonist', content: '主角，寒门出身，杂灵根（后被九天玄功改造为水灵根），性格沉稳隐忍，目标是修仙问道。', sort: 0 },
    { workId: work.id, name: '苏婉清', role: 'supporting', content: '青衣女子，青云宗长老亲传弟子，眉宇间有锋芒，对林青云的隐忍很欣赏。', sort: 1 },
    { workId: work.id, name: '李存志', role: 'antagonist', content: '外门十二期师兄，仗势欺人，背后有宗门内部势力支持。', sort: 2 },
  ]);

  // 4. 插入章节 + 同步生成摘要
  for (let i = 0; i < DEMO_CHAPTERS.length; i++) {
    const ch = DEMO_CHAPTERS[i];
    const htmlContent = `<h1>${ch.title}</h1>${ch.content.split('\n\n').map(p => `<p>${p}</p>`).join('')}`;
    const plainTextLen = ch.content.replace(/\n/g, '').length;

    const [chapter] = await db.insert(chapters).values({
      workId: work.id,
      title: ch.title,
      content: htmlContent,
      orderIndex: i,
      wordCount: plainTextLen,
    }).returning();
    console.log(`[seed] 章节 ${i + 1}/${DEMO_CHAPTERS.length} 插入完成: ${ch.title}`);

    // 同步生成摘要（等结果，方便观察）
    console.log(`[seed]   生成摘要中...`);
    const summary = await generateChapterSummary(htmlContent, ch.title);
    if (summary) {
      await db.insert(chapterSummaries).values({
        chapterId: chapter.id,
        workId: work.id,
        summary: summary.summary,
        keyEvents: summary.keyEvents,
        involvedCharacters: summary.involvedCharacters,
        openHooks: summary.openHooks,
        characterChanges: summary.characterChanges,
      });
      console.log(`[seed]   ✓ 摘要: ${summary.summary.slice(0, 30)}...`);
    } else {
      console.log(`[seed]   ✗ 摘要生成失败`);
    }
  }

  // 5. 更新作品总字数
  const totalWords = DEMO_CHAPTERS.reduce((sum, ch) => sum + ch.content.replace(/\n/g, '').length, 0);
  await db.update(works).set({ wordCount: totalWords, chapterCount: DEMO_CHAPTERS.length }).where(eq(works.id, work.id));

  // 6. 生成风格 DNA
  console.log(`[seed] 生成风格 DNA...`);
  await generateAndSaveStyleDNA(work.id, userId);
  const [dna] = await db.select().from(workStyleDNA).where(eq(workStyleDNA.workId, work.id)).limit(1);
  if (dna) {
    console.log(`[seed]   ✓ DNA: 平均句长 ${dna.avgSentenceLength}, 对话占比 ${dna.dialogueRatio}, 标志性词: ${dna.signatureWords.slice(0, 5).join('、')}`);
  }

  console.log(`\n[seed] 完成！workId=${work.id}, userId=${userId}`);
  console.log(`[seed] 访问 http://localhost:3000 进入作品查看效果`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] 失败:', err);
  process.exit(1);
});
