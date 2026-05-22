// agent-job-poller.js — Agent Job 实时刷新（SSE + 轮询兜底）
// 提供 subscribeAgentJob(jobId, callbacks) API

(function () {
    'use strict';

    const POLL_INTERVAL = 10000; // 轮询兜底：10 秒
    const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api';

    const activeSubscriptions = new Map(); // jobId -> { abort, stop }

    /**
     * 用 fetch + ReadableStream 手动解析 SSE（支持 Authorization header）
     */
    async function connectSSE(url, callbacks, sub) {
        const authToken = localStorage.getItem('jz_token');
        const res = await fetch(url, {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });
        if (!res.ok) throw new Error(`SSE 连接失败 ${res.status}`);
        if (!res.body) throw new Error('响应无 body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = null;

        const flushLine = (line) => {
            const t = line.trim();
            if (!t) { currentEvent = null; return; }
            if (t.startsWith('event:')) { currentEvent = t.slice(6).trim(); return; }
            if (!t.startsWith('data:')) return;
            const data = t.slice(5).trim();
            if (data === '[DONE]') return;

            try {
                const payload = JSON.parse(data);
                if (currentEvent === 'connected') callbacks.onUpdate?.(payload);
                if (currentEvent === 'job_update') {
                    callbacks.onUpdate?.(payload);
                    if (['done', 'failed', 'aborted'].includes(payload.status)) {
                        callbacks.onDone?.();
                    }
                }
                if (currentEvent === 'done') callbacks.onDone?.();
            } catch {
                // 非 JSON payload 忽略
            }
        };

        while (!sub.abort && !sub.sseAbort) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nl);
                buffer = buffer.slice(nl + 1);
                flushLine(line);
            }
        }
        if (buffer) flushLine(buffer);
        reader.releaseLock();
    }

    /**
     * 订阅 Agent Job 实时更新
     * @param {number} jobId
     * @param {object} callbacks
     *   - onUpdate(data): { status, progress, steps, events }
     *   - onDone(): 任务结束（done/failed/aborted）
     *   - onError(err): 连接错误
     */
    function subscribeAgentJob(jobId, callbacks = {}) {
        // 如果已有订阅，先取消
        unsubscribeAgentJob(jobId);

        const sub = { abort: false };
        activeSubscriptions.set(jobId, sub);

        let useSSE = document.visibilityState === 'visible';
        let pollTimer = null;
        let ssePromise = null;

        const startSSE = () => {
            useSSE = true;
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

            sub.sseAbort = false;
            const url = `${API_BASE}/ai/agent-jobs/${jobId}/stream`;
            ssePromise = connectSSE(url, callbacks, sub).catch((err) => {
                // SSE 出错时降级到轮询
                if (!sub.abort && !sub.sseAbort) {
                    callbacks.onError?.(err);
                    startPolling();
                }
            });

            sub.stop = () => {
                sub.sseAbort = true;
            };
        };

        const startPolling = () => {
            useSSE = false;

            const poll = async () => {
                if (sub.abort) return;
                try {
                    const authToken = localStorage.getItem('jz_token');
                    const res = await fetch(`${API_BASE}/ai/agent-jobs/${jobId}`, {
                        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                    });
                    if (!res.ok) throw new Error('poll failed');
                    const data = await res.json();
                    callbacks.onUpdate?.({
                        status: data.job?.status,
                        progress: data.job?.progress,
                        steps: data.steps || [],
                        events: data.events || [],
                    });
                    if (['done', 'failed', 'aborted'].includes(data.job?.status)) {
                        callbacks.onDone?.();
                        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
                        activeSubscriptions.delete(jobId);
                    }
                } catch (err) {
                    callbacks.onError?.(err);
                }
            };

            poll(); // 立即执行一次
            pollTimer = setInterval(poll, POLL_INTERVAL);
            sub.stop = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
        };

        // 根据页面可见性选择模式
        if (useSSE) {
            startSSE();
        } else {
            startPolling();
        }

        // 页面可见性变化时切换模式
        const onVisibility = () => {
            if (sub.abort) return;
            if (document.visibilityState === 'visible' && !useSSE) {
                sub.stop?.();
                startSSE();
            } else if (document.visibilityState === 'hidden' && useSSE) {
                sub.stop?.();
                startPolling();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        // 返回取消函数
        return () => {
            sub.abort = true;
            sub.stop?.();
            document.removeEventListener('visibilitychange', onVisibility);
            activeSubscriptions.delete(jobId);
        };
    }

    function unsubscribeAgentJob(jobId) {
        const sub = activeSubscriptions.get(jobId);
        if (sub) {
            sub.abort = true;
            sub.stop?.();
            activeSubscriptions.delete(jobId);
        }
    }

    function unsubscribeAllAgentJobs() {
        for (const [jobId] of activeSubscriptions) {
            unsubscribeAgentJob(jobId);
        }
    }

    window.jzAgentPoller = {
        subscribeAgentJob,
        unsubscribeAgentJob,
        unsubscribeAllAgentJobs,
    };
})();
