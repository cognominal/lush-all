import { test, expect } from "bun:test";
import {
  runJsonArrayPipe,
  type ArrayValueParser
} from "../src/coroutine-pipe";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const clarinet = require("clarinet") as {
  parser: (options: { arrayValues: boolean; arrayValuesDepth: number }) =>
    ArrayValueParser;
};

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function createParser(): ArrayValueParser {
  return clarinet.parser({ arrayValues: true, arrayValuesDepth: 1 });
}

async function* streamResponse(response: Response) {
  if (!response.body) return;
  const reader = response.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      yield decoder.decode(value, { stream: true });
    }
  }
  const tail = decoder.decode();
  if (tail) yield tail;
}

function chunkString(source: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < source.length; i += size) {
    chunks.push(source.slice(i, i + size));
  }
  return chunks;
}

function startServer(handler: () => Response): { port: number; stop: () => void } {
  const base = 20_000 + Math.floor(Math.random() * 20_000);
  for (let i = 0; i < 50; i += 1) {
    const port = ((base + i) % 20_000) + 20_000;
    try {
      return Bun.serve({
        port,
        fetch: handler
      });
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined;
      if (code === "EADDRINUSE") {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to bind a local test port.");
}

const canServe = (() => {
  try {
    const probe = startServer(() => new Response("ok"));
    probe.stop();
    return true;
  } catch {
    return false;
  }
})();

const serverTest = canServe ? test : test.skip;

serverTest("streams chunked JSON from localhost with Bun.serve", async () => {
  const total = 250;
  const size = 64;
  const payload = "x".repeat(size);

  const server = startServer(() => {
    const stream = new ReadableStream({
      start(controller) {
        const parts = ["["];
        for (let i = 0; i < total; i += 1) {
          const entry = JSON.stringify(payload);
          parts.push(i === 0 ? entry : `,${entry}`);
        }
        parts.push("]");

        for (const part of parts) {
          for (const chunk of chunkString(part, 1)) {
            controller.enqueue(encoder.encode(chunk));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/json" }
    });
  });

  const url = `http://127.0.0.1:${server.port}`;

  try {
    const response = await fetch(url);
    let count = 0;

    await runJsonArrayPipe(streamResponse(response), createParser, (value) => {
      if (count === 0) {
        expect(typeof value).toBe("string");
        if (typeof value === "string") {
          expect(value.length).toBe(size);
        }
      }
      count += 1;
    });

    expect(count).toBe(total);
  } finally {
    server.stop();
  }
});
