# Coroutine JSON pipe

## Goal

Stream JSON and hand off each array element to downstream handlers without
waiting for the full document to load. This keeps memory usage small and
lets the pipe run as a single process.

## Library adaptation

The JSON parser fork lives in `~/mine/coroutine-json` on the `coroutine`
branch. It is based on `clarinet` and adds an `arrayvalue` event.

- `arrayvalue` fires every time a complete array element closes.
- `arrayValues` enables this behavior.
- `arrayValuesDepth` limits emission to a specific array depth.

This keeps the normal `value`, `openarray`, and `closearray` events intact
while allowing array elements to flow downstream one at a time.

## Downstream flow

1. A source stream yields JSON text chunks.
2. The parser emits `arrayvalue` events for each element.
3. `coroutine-pipe.ts` queues values in an async buffer.
4. Downstream consumers `for await` each value and process it.

This pattern lets us pipe structured data into later steps without loading
entire arrays in memory.

## Integration notes

- The pipe is generic and accepts any parser that matches the interface in
  `coroutine-pipe.ts`.
- Errors close the queue and rethrow from the async generator.
- This is designed for arrays, but nested arrays also emit values when the
  depth matches `arrayValuesDepth`.
