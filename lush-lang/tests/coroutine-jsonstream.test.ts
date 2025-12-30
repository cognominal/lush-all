import { expect, test } from "bun:test";
import { once } from "node:events";
import { createRequire } from "node:module";
import { PassThrough, type ReadWriteStream } from "node:stream";
import {
  runJsonArrayPipe,
  type ArrayValueParser,
  type ArrayValueParserFactory
} from "../src/coroutine-pipe";

const require = createRequire(import.meta.url);

type JsonStreamModule = {
  stringify: (open?: string, sep?: string, close?: string) => ReadWriteStream;
};

type ClarinetModule = {
  parser: (options: { arrayValues: boolean; arrayValuesDepth: number }) =>
    ArrayValueParser;
};

const JSONStream = require("JSONStream") as JsonStreamModule;
const clarinet = require("clarinet") as ClarinetModule;

function createParser(): ArrayValueParser {
  return clarinet.parser({ arrayValues: true, arrayValuesDepth: 1 });
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

async function* streamChunks(stream: AsyncIterable<unknown>) {
  for await (const chunk of stream) {
    if (typeof chunk === "string") {
      yield chunk;
      continue;
    }
    if (chunk instanceof Uint8Array) {
      yield decoder.decode(chunk);
      continue;
    }
    yield String(chunk);
  }
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

async function* streamToAsyncIterable(stream: ReadWriteStream) {
  const values: unknown[] = [];
  let done = false;
  let error: unknown = null;
  let notify: (() => void) | null = null;

  const wake = () => {
    if (!notify) return;
    const resolve = notify;
    notify = null;
    resolve();
  };

  stream.on("data", (chunk) => {
    values.push(chunk);
    wake();
  });
  stream.on("end", () => {
    done = true;
    wake();
  });
  stream.on("error", (err) => {
    error = err;
    done = true;
    wake();
  });
  if (typeof stream.resume === "function") {
    stream.resume();
  }

  while (!done || values.length > 0) {
    if (error) {
      throw error;
    }
    const value = values.shift();
    if (value !== undefined) {
      yield value;
      continue;
    }
    await new Promise<void>((resolve) => {
      notify = resolve;
    });
  }
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

serverTest("streams chunked JSON from localhost", async () => {
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
}, 10_000);

test("streams a smaller array using JSONStream", async () => {
  const total = 2_000;
  const size = 256;
  const payload = "x".repeat(size);

  const stream = JSONStream.stringify("[", ",", "]");
  const output = new PassThrough();
  stream.pipe(output);

  const parserFactory: ArrayValueParserFactory = createParser;

  const writer = async () => {
    for (let i = 0; i < total; i += 1) {
      const ok = stream.write(payload);
      if (!ok) {
        await once(stream, "drain");
      }
    }
    stream.end();
  };

  let count = 0;
  const consumer = async () => {
    await runJsonArrayPipe(
      streamChunks(streamToAsyncIterable(output)),
      parserFactory,
      (value) => {
        if (count === 0) {
          expect(typeof value).toBe("string");
          if (typeof value === "string") {
            expect(value.length).toBe(size);
          }
        }
        count += 1;
      }
    );
  };

  await Promise.all([writer(), consumer()]);
  expect(count).toBe(total);
}, 20_000);

test.skip("streams 1M strings of 1K using JSONStream", async () => {
  const total = 1_000_000;
  const size = 1_024;
  const payload = "x".repeat(size);

  const stream = JSONStream.stringify("[", ",", "]");
  const output = new PassThrough();
  stream.pipe(output);

  const parserFactory: ArrayValueParserFactory = createParser;

  const writer = async () => {
    for (let i = 0; i < total; i += 1) {
      const ok = stream.write(payload);
      if (!ok) {
        await once(stream, "drain");
      }
    }
    stream.end();
  };

  let count = 0;
  const consumer = async () => {
    await runJsonArrayPipe(
      streamChunks(streamToAsyncIterable(output)),
      parserFactory,
      (value) => {
        if (count === 0) {
          expect(typeof value).toBe("string");
          if (typeof value === "string") {
            expect(value.length).toBe(size);
          }
        }
        count += 1;
      }
    );
  };

  await Promise.all([writer(), consumer()]);
  expect(count).toBe(total);
});
