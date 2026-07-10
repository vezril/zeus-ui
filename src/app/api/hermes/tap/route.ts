import { NextRequest } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { ensureInspector } from "@/lib/hermes/server/inspector";
import type { TapMessage } from "@/lib/hermes/types";

export const runtime = "nodejs";

interface PulledMessage {
  ackId: string;
  payload: string;
  attributes: Record<string, string>;
  publishTime: string;
}

const PULL_MAX = 20;
const IDLE_MS = 700;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET /api/hermes/tap?topic=… — a live Server-Sent Events feed of a topic's
 * traffic, read non-destructively from a Zeus-managed inspector subscription
 * (fan-out copy). The loop pulls the inspector, emits one SSE event per message,
 * acks it, and stops when the client disconnects (request abort).
 */
export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic");
  if (!topic) {
    return new Response("topic query param is required", { status: 400 });
  }

  let subId: string;
  try {
    subId = await ensureInspector(topic);
  } catch (e) {
    return new Response(
      e instanceof Error ? e.message : "could not open tap",
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const signal = req.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      const comment = (text: string) =>
        controller.enqueue(encoder.encode(`: ${text}\n\n`));

      comment(`tap open on ${topic}`);

      try {
        while (!signal.aborted) {
          const res = await hermesFetch(
            `/v1/subscriptions/${encodeURIComponent(subId)}/pull`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ max: PULL_MAX }),
            }
          );
          if (!res.ok) {
            send("tap-error", { status: res.status });
            break;
          }
          const { messages } = (await res.json()) as {
            messages: PulledMessage[];
          };

          if (messages.length === 0) {
            comment("keep-alive");
            await sleep(IDLE_MS);
            continue;
          }

          for (const m of messages) {
            const tap: TapMessage = {
              id: m.ackId,
              payload: m.payload,
              // Over REST the payload is already UTF-8 decoded; a replacement
              // char is our best signal that the original was binary.
              isText: !m.payload.includes("�"),
              attributes: m.attributes ?? {},
              publishTime: m.publishTime,
            };
            send("message", tap);
          }

          // Acknowledge the batch — the inspector has a single consumer (Zeus),
          // so acking just clears the displayed messages (no redelivery needed).
          await hermesFetch(
            `/v1/subscriptions/${encodeURIComponent(subId)}/ack`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ackIds: messages.map((m) => m.ackId) }),
            }
          );
        }
      } catch {
        // Client went away or a transient error — fall through to close.
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
