// agent-job-poller.js — Agent Job 实时刷新（SSE + 轮询兜底）
// 提供 subscribeAgentJob(jobId, callbacks) API

(function () {
    'use strict';

    const POLL_INTERVAL = 10000; // 轮询兜底：10 秒
    const API_BASE = window.API_BASE || '';

    const activeSubscriptions = new Map(); // jobId -> { abort, type }

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

        // 页面在前台时用 SSE；切到后台时自动降级为轮询
        let useSSE = document.visibilityState === 'visible';
        let pollTimer = null;

        const startSSE = () => {
            if (sub.abort) return;
            useSSE = true;
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

            const authToken = localStorage.getItem('authToken');
            const url = `${API_BASE}/ai/agent-jobs/${jobId}/stream`;
            const es = new EventSource(url, {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
            });

            es.addEventListener('connected', (e) => {
                try { callbacks.onUpdate?.(JSON.parse(e.data)); } catch { }
            });

            es.addEventListener('job_update', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    callbacks.onUpdate?.(data);
                    if (data.status === 'done' || data.status === 'failed' || data.status === 'aborted') {
                        callbacks.onDone?.();
                        es.close();
                        activeSubscriptions.delete(jobId);
                    }
                } catch { }
            });

            es.addEventListener('done', () => {
                callbacks.onDone?.();
                es.close();
                activeSubscriptions.delete(jobId);
            });

            es.onerror = () => {
                // SSE 出错时降级到轮询
                es.close();
                if (!sub.abort) startPolling();
            };

            sub.stop = () => { es.close(); };
        };

        const startPolling = () => {
            if (sub.abort) return;
            useSSE = false;

            const poll = async () => {
                if (sub.abort) return;
                try {
                    const authToken = localStorage.getItem('authToken');
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
            sub.stop = () => { if (pollTimer) clearInterval(pollTimer); };
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
