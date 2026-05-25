/**
 * Dashboard 端到端验收脚本
 * 运行：cd backend && npx tsx -r dotenv/config scripts/e2e-dashboard.ts
 *
 * 流程：注册 → 登录 → 创建作品 → 新建章节 → 保存正文 → 验证 /api/stats
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const TEST_PHONE = `138${String(Math.random()).slice(2, 10)}`;
const TEST_PASS = 'Test1234!';

async function e2e() {
  console.log('[e2e] 启动浏览器...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. 注册
    console.log('[e2e] 注册账号:', TEST_PHONE);
    const regRes = await page.request.post(`${BASE}/api/auth/register`, {
      data: { phone: TEST_PHONE, password: TEST_PASS, username: '验收用户' },
    });
    if (!regRes.ok()) {
      const body = await regRes.json().catch(() => ({}));
      console.log('[e2e] 注册结果:', regRes.status(), body);
    }

    // 2. 登录
    console.log('[e2e] 登录...');
    const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
      data: { username: TEST_PHONE, password: TEST_PASS },
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error('登录失败: ' + JSON.stringify(loginData));
    const token = loginData.token;
    console.log('[e2e] 登录成功, token 获取成功');

    // 3. 创建作品
    console.log('[e2e] 创建作品...');
    const workRes = await page.request.post(`${BASE}/api/works`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: '验收作品',
        perspective: 'third',
        channel: 'male',
        genre: '玄幻',
        lengthType: 'long',
      },
    });
    const work = await workRes.json();
    console.log('[e2e] 作品创建:', work.id ? `id=${work.id}` : '失败', JSON.stringify(work).slice(0, 200));
    if (!work.id) throw new Error('创建作品失败');

    // 4. 新建章节
    console.log('[e2e] 新建章节...');
    const chRes = await page.request.post(`${BASE}/api/works/${work.id}/chapters`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: '第一章', content: '这是一个测试章节，正文内容。'.repeat(10) },
    });
    const chapter = await chRes.json();
    console.log('[e2e] 章节创建:', chapter.id ? `id=${chapter.id} wordCount=${chapter.wordCount}` : '失败');
    if (!chapter.id) throw new Error('创建章节失败');

    // 5. 保存正文（触发 chapter_versions + creation_activities）
    console.log('[e2e] 更新章节正文...');
    const updateRes = await page.request.put(`${BASE}/api/works/${work.id}/chapters/${chapter.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: '更新后的正文内容，字数更多一些。'.repeat(20) },
    });
    const updated = await updateRes.json();
    console.log('[e2e] 章节更新:', updated.id ? `wordCount=${updated.wordCount}` : '失败');

    // 6. 验证 /api/stats
    console.log('[e2e] 验证 Dashboard stats...');
    const statsRes = await page.request.get(`${BASE}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stats = await statsRes.json();
    console.log('[e2e] stats.todayWords:', stats.todayWords);
    console.log('[e2e] stats.workCount:', stats.workCount);
    console.log('[e2e] stats.totalWords:', stats.totalWords);
    console.log('[e2e] stats.todayActivities 数量:', (stats.todayActivities || []).length);
    console.log('[e2e] stats.consecutiveDays:', stats.consecutiveDays);

    // 7. 验证 /api/works/:id/dashboard
    console.log('[e2e] 验证作品仪表盘...');
    const dashRes = await page.request.get(`${BASE}/api/works/${work.id}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dash = await dashRes.json();
    console.log('[e2e] dashboard.chapters 数量:', (dash.chapters || []).length);
    console.log('[e2e] dashboard.work.wordCount:', dash.work?.wordCount);

    // 断言
    const checks = [];
    checks.push(['stats.todayWords > 0', stats.todayWords > 0]);
    checks.push(['stats.workCount === 1', stats.workCount === 1]);
    checks.push(['stats.totalWords > 0', stats.totalWords > 0]);
    checks.push(['stats.todayActivities.length > 0', (stats.todayActivities || []).length > 0]);
    checks.push(['stats.consecutiveDays >= 1', stats.consecutiveDays >= 1]);
    checks.push(['dashboard.chapters.length > 0', (dash.chapters || []).length > 0]);
    checks.push(['dashboard.work.wordCount > 0', (dash.work?.wordCount || 0) > 0]);

    console.log('\n[e2e] 验收结果:');
    let allPass = true;
    for (const [name, pass] of checks) {
      console.log(`  ${pass ? '✅' : '❌'} ${name}`);
      if (!pass) allPass = false;
    }

    if (allPass) {
      console.log('\n[e2e] 全部通过 ✅');
    } else {
      console.log('\n[e2e] 有未通过项 ❌');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[e2e] 错误:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

e2e();
