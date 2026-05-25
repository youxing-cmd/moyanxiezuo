async function api(path, options = {}) {
    const url = API_BASE + path;
    // 30s 超时，防止请求永远挂起
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const opts = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            ...options.headers,
        },
        ...options,
        signal: controller.signal,
    };
    if (opts.body && typeof opts.body === 'object') {
        opts.body = JSON.stringify(opts.body);
    }
    let res;
    try {
        res = await fetch(url, opts);
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
        }
        throw err;
    }
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        if (res.status === 401) {
            authToken = '';
            currentUser = null;
            localStorage.removeItem('jz_token');
            throw new Error(data?.error || '登录已过期，请重新登录');
        }
        if (res.status === 403 && data?.code === 'INSUFFICIENT_POINTS') {
            showToast(`积分不足，当前剩余 ${data.have ?? 0} 积分，每次调用消耗 1 积分`, 'warning');
        }
        throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
}

// ========== 认证 ==========
