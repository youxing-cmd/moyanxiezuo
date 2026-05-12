/**
 * 飞书 OAuth 2.0 登录服务
 * 文档：https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/authentication/overview
 */

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_REDIRECT_URI = process.env.FEISHU_REDIRECT_URI || '';

interface FeishuUserInfo {
  union_id: string;
  open_id: string;
  name: string;
  en_name?: string;
  avatar_url?: string;
  email?: string;
  mobile?: string;
}

/** 获取飞书 OAuth 授权 URL */
export function getFeishuAuthUrl(): string {
  if (!FEISHU_APP_ID || !FEISHU_REDIRECT_URI) {
    throw new Error('飞书登录未配置：请检查 FEISHU_APP_ID 和 FEISHU_REDIRECT_URI');
  }
  const params = new URLSearchParams({
    app_id: FEISHU_APP_ID,
    redirect_uri: FEISHU_REDIRECT_URI,
    state: Math.random().toString(36).slice(2),
  });
  return `https://open.feishu.cn/open-apis/authen/v1/index?${params.toString()}`;
}

/** 获取 app_access_token（应用级别） */
async function getAppAccessToken(): Promise<string> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取 app_access_token 失败: ${data.msg}`);
  }
  return data.app_access_token as string;
}

/** 用 code 换 user_access_token */
async function getUserAccessToken(code: string): Promise<string> {
  const appToken = await getAppAccessToken();
  const res = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${appToken}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
    }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取 user_access_token 失败: ${data.msg}`);
  }
  return data.data.access_token as string;
}

/** 获取飞书用户信息 */
async function getFeishuUserInfoRaw(accessToken: string): Promise<FeishuUserInfo> {
  const res = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取用户信息失败: ${data.msg}`);
  }
  return data.data as FeishuUserInfo;
}

/** 用 code 获取完整用户信息 */
export async function getFeishuUserByCode(code: string): Promise<FeishuUserInfo> {
  const userAccessToken = await getUserAccessToken(code);
  return getFeishuUserInfoRaw(userAccessToken);
}

export type { FeishuUserInfo };
