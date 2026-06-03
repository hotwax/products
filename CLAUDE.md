# products — agent instructions

HotWax **Products** app — Ionic Vue (`@ionic/vue`), Vite build, Pinia, vue-i18n.
Shared pieces come from `@common`. Screens live in `src/views/`, shared UI in `src/components/`.

## Designing / building in Figma

This app's screens are mocked in the Figma file **HC-Ionic-design-system**
(`fileKey: bVPRRw282CqGKMdbz7dciH`, Products page `54228:58619`).

**Before writing anything to Figma, read [`docs/figma-agent-guide.md`](docs/figma-agent-guide.md).**
It is the source of truth for the design-system conventions, the component node-ID map, and the
non-obvious traps (components are local → instance by node id; text is internal to instances; colors
are paint styles not variables; Select natural width ≈343; etc.). Update that guide whenever you
learn something new, so the next agent doesn't repeat the mistake.

## Code conventions

- UI is 100% standard Ionic (`ion-*`); reuse existing `src/components/*` before adding new ones.
- Build: `pnpm build` (vue-tsc + vite). Lint: `pnpm lint`.
