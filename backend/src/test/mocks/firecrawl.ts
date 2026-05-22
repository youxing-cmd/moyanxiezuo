// mock-firecrawl.ts — 为 Agent E2E 测试提供不依赖真实 API 的 firecrawl 响应
// 通过 process.env.MOCK_FIRECRAWL=true 启用

export function getMockFirecrawlResearch(): string {
  return `【《雪中悍刀行》核心风格与爆款元素分析】
来源：mock-research-source

1. 核心风格
   - 古风玄幻 + 历史架空融合
   - 大量诗词化语句和古典意象
   - "庙堂权谋"与"江湖侠义"双线并行

2. 爽点设计
   - 隐忍型主角：长期装弱，关键时刻爆发
   - 信息差反转：读者知道主角实力，配角不知道
   - 护短情结：为身边人出手时最燃

3. 爆款元素
   - 强钩子开头：反常事件 + 悬念
   - 高密度冲突：每章至少一个小高潮
   - 留钩子结尾：每段结尾都有未解之谜

4. 角色塑造
   - 主角：表面纨绔，实际深不可测
   - 配角群像：每个配角都有独立故事线
   - 反派：有逻辑的坏，不是单纯作恶`;
}
