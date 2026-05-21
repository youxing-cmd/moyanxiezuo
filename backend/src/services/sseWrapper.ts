// SSE 包装层：透传上游 LLM 流式输出，同时支持注入自定义事件
// 自定义事件格式：event: xxx\ndata: {...}\n\n
//
// 使用示例：
//   const { stream, injectEvent } = wrapSSE(upstream.body!);
//   injectEvent('step_start', JSON.stringify({ stepId: '2', title: '研究《xx》' }));
//   return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });

export interface SSEWrapper {
  stream: ReadableStream<Uint8Array>;
  injectEvent: (event: string, data: string) => void;
}

export function wrapSSE(upstream: ReadableStream<Uint8Array>): SSEWrapper {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;

      // 透传上游
      const reader = upstream.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            ctrl.enqueue(value);
          }
        } catch (err) {
          ctrl.error(err);
          return;
        }
        // 上游结束时不主动 close，等待 injectEvent 调用方决定
      };
      pump();
    },
  });

  function injectEvent(event: string, data: string) {
    if (!controller) return;
    const chunk = encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
    try {
      controller.enqueue(chunk);
    } catch {
      // stream 已关闭，静默忽略
    }
  }

  return { stream, injectEvent };
}

// 快捷方法：构造一条 SSE 事件行（不依赖 wrapSSE）
export function formatSSEEvent(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}
