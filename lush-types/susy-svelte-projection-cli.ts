import YAML from "yaml";
import { susySvelteProjection } from "./susy-svelte-projection";

declare global {
  interface ImportMeta {
    main?: boolean;
  }
}

// Run the CLI mode for Susy Svelte projections.
const runCli = async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const filePath = process.argv[2] ?? "lk.svelte";
  const source = readFileSync(filePath, "utf8");
  const root = susySvelteProjection(source, resolve(filePath));
  process.stdout.write(`${YAML.stringify(root)}`);
};

// Execute when invoked directly.
if (import.meta.main) {
  void runCli();
}
