# Lush Ethos

This document is a sequitur to `lw-ethos.md`.

Lush is a language studio for people who value Larry Wall's original ethos:
pragmatism over purity, context over dogma, and usefulness over fashion. Our
goal is not to recreate Perl or Raku as museum pieces. Our goal is to carry
that ethos into the web ecosystem, where most tools, runtimes, and teams now
live.

## Larry Wall's ethos, continued

Larry Wall's approach can be summarized as practical humanism in language
design:

- Make easy things easy.
- Keep hard things possible.
- Respect real users and real workflows.
- Accept multiplicity when it improves clarity or velocity.

Lush applies this by treating language design as an iterative studio process:
prototypes, feedback loops, and concrete use in scripts, editors, and apps.

## Why the web ecosystem

The web gives language tooling broad reach and low friction:

- Portable runtimes across operating systems.
- Rich editor integration and collaborative interfaces.
- Mature package ecosystems and deployment paths.
- Immediate sharing, testing, and iteration.

This ecosystem lets us ship language ideas quickly, then refine them through
actual usage instead of long VM-centric release cycles.

## Why `lish` can be more practical than Perl or Raku

`lish` is designed as a shell-first, data-flow language that embraces pipes and
redirections as core composition tools.

```sh
# Filter, transform, and summarize structured logs
lish 'logs
  | where level == "error"
  | map { ts, service, msg }
  | group-by service
  | count'

# Compose with other tools through standard streams
lish 'read stdin | parse yaml | get services.api.url' < config.yaml
lish 'scan src | where ext == "ts" | count' > report.txt
lish 'events | where severity >= 3' | jq '.[] | .message'
```

Compared with legacy shell glue around Perl or deeper runtime coupling in
Raku, `lish` prioritizes direct interoperability with the modern toolchain:
stdin/stdout, JSON/YAML flows, browser-backed IDE support, and scriptability in
CI.

## Pragmatic implementation: Acorn over a custom VM

Lush chooses pragmatic implementation over VM maximalism. Instead of building
around a bespoke virtual machine model like MoarVM, we can leverage proven web
infrastructure such as Acorn for parsing and the surrounding JavaScript
ecosystem for tooling.

Benefits of this choice:

- Faster implementation and iteration cycles.
- Lower onboarding cost for contributors.
- Better integration with existing web tooling.
- Fewer niche runtime constraints for users.

This does not reject Raku's technical achievements. It recognizes a practical
constraint: VM-centered ecosystems can become niche when their operational
surface is too specialized.

## Studio principle

Lush exists to help teams design and evolve languages that are expressive,
pragmatic, and deployable on today's web stack. `lish` is the shell expression
of that principle: composable, stream-oriented, and operationally simple.
