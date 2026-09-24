import type { RealtimeMessage } from "./eventBus";

const HEARTBEAT_MS = 15_000;

interface SseOptions {
  signal: AbortSignal;
  /** Called once with a `send` function. Return a cleanup that runs on disconnect. */
  start: (send: (msg: RealtimeMessage) => void) => () => void;
}

/**
 * Builds a Server-Sent Events response. Cleanup is tied to the request's abort signal
 * so a closed tab always releases its bus subscription and heartbeat timer.
 */
export function sseResponse({ signal, start }: SseOptions): Response {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          teardown();
        }
      };
      const teardown = () => {
        clearInterval(heartbeat);
        cleanup?.();
        cleanup = undefined;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      write("retry: 3000\n\n");
      cleanup = start((msg) => write(`event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`));
      heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);

      if (signal.aborted) teardown();
      else signal.addEventListener("abort", teardown, { once: true });
    },
    cancel() {
      clearInterval(heartbeat);
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
