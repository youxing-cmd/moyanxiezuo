import 'dotenv/config';
import { callLLM } from './src/services/llm.js';
import { getPresetModels } from './src/config/presetModels.js';

async function test() {
  const models = getPresetModels();
  if (models.length === 0) {
    console.error('❌ 没有可用的预设模型，请检查 .env 中的 WANGSU_BASE_URL / WANGSU_API_KEY');
    process.exit(1);
  }

  for (const m of models) {
    console.log(`\n[TEST] ${m.id} (${m.modelName})`);
    try {
      const res = await callLLM(
        [{ role: 'user', content: '请只回复"ok"两个字，不要加任何其他内容' }],
        false,
        { provider: m.provider, baseUrl: m.baseUrl, apiKey: m.apiKey, modelName: m.modelName },
      );
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const ok = content.trim().toLowerCase().includes('ok');
      console.log(`  -> ${ok ? '✅' : '⚠️'}  ${content.trim().slice(0, 60).replace(/\n/g, ' ')}`);
    } catch (err: any) {
      console.log(`  -> ❌  ${err.message}`);
    }
  }
}

test();
