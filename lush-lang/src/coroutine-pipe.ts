export type ArrayValueHandler = (value: unknown) => void;

export interface ArrayValueParser {
  onarrayvalue?: ArrayValueHandler;
  onerror?: (error: Error) => void;
  onend?: () => void;
  write(chunk: string): void;
  end(): void;
}

export type ArrayValueParserFactory = () => ArrayValueParser;

const queueEnd = Symbol("queue-end");

type QueueItem<T> = T | typeof queueEnd;

type DownstreamHandler = (value: unknown) => void | Promise<void>;

class AsyncQueue<T> {
  private values: QueueItem<T>[] = [];
  private waiters: Array<(value: QueueItem<T>) => void> = [];
  private closed = false;

  push(value: T): void {
    if (this.closed) return;
    if (this.waiters.length) {
      const resolve = this.waiters.shift();
      if (resolve) resolve(value);
      return;
    }
    this.values.push(value);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.waiters.length) {
      for (const resolve of this.waiters) resolve(queueEnd);
      this.waiters = [];
      return;
    }
    this.values.push(queueEnd);
  }

  async shift(): Promise<QueueItem<T>> {
    const value = this.values.shift();
    if (value !== undefined) return value;
    if (this.closed) return queueEnd;
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }
}

export async function* streamJsonArrayElements(
  source: AsyncIterable<string> | Iterable<string>,
  createParser: ArrayValueParserFactory
): AsyncGenerator<unknown> {
  const queue = new AsyncQueue<unknown>();
  const parser = createParser();
  let parseError: Error | null = null;

  parser.onarrayvalue = (value) => queue.push(value);
  parser.onerror = (error) => {
    parseError = error;
    queue.close();
  };
  parser.onend = () => queue.close();

  for await (const chunk of source) {
    parser.write(chunk);
  }
  parser.end();

  while (true) {
    const item = await queue.shift();
    if (item === queueEnd) {
      if (parseError) throw parseError;
      return;
    }
    yield item;
  }
}

export async function runJsonArrayPipe(
  source: AsyncIterable<string> | Iterable<string>,
  createParser: ArrayValueParserFactory,
  handleValue: DownstreamHandler
): Promise<void> {
  for await (const value of streamJsonArrayElements(source, createParser)) {
    await handleValue(value);
  }
}
