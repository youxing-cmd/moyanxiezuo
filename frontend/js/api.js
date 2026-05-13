async function api(path, options = {}) {
    const url = API_BASE + path;
    const opts = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            ...options.headers,
        },
        ...options,
    };
    if (opts.body && typeof opts.body === 'object') {
        opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, opts);
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
