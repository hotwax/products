# Figma Agent Guide — HC Ionic Design System

**Audience:** AI agents (and humans) building or updating app screens in the Figma file
**HC-Ionic-design-system** (`fileKey: bVPRRw282CqGKMdbz7dciH`) via the Figma MCP `use_figma` tool.

**Read this BEFORE writing to Figma.** It encodes conventions + the non-obvious traps that
otherwise cost a dozen trial-and-error round-trips. Keep it updated when you learn something new
(see "How to extend this guide" at the bottom).

> Status: v1, written after building the **Product workbench** screen on the Products page.
> Items marked 🟡 are conventions to confirm with the design team; everything else is verified fact.

---

## 0. STOP — hard rules (these were violated; do not repeat)

**The job is to REBUILD the UI from the design system, not to draw something that looks like it.**
A frame that looks identical in a screenshot but isn't the real component/style is a FAILURE, not a
shortcut. Three non-negotiable rules:

1. **Use the same component the code uses. Never hand-build a lookalike for a component that exists.**
   For every element, ask: *what `ion-*` is this in the source?* Then instance THAT Figma component.
   - `ion-button` → **Button** instance. NOT colored text, NOT a styled frame. (Even links / "Open" /
     "Add more" / "Go to OMS" are `ion-button`s — instance the Button.)
   - `ion-segment` → **Segment** + **Segment Button** instances. NOT manual pill frames.
   - `ion-input` → **Input** instance. NOT a bordered box with a text node.
   - `ion-avatar`/`ion-toggle`/`ion-checkbox`/`ion-chip`/`ion-item` → their components.
   - If a component is awkward to populate, that is a reason to **write a correct helper once**
     (resolve its node id, set its text via the visible-text recipe), NOT to fake it.
2. **Every text node uses a pre-built text style** (`node.textStyleId = styleId`). NEVER leave raw
   `fontName`/`fontSize` as the final styling. Map the content role to a DS text style
   (H1–H6, Subtitle 1/2, Body 1/2, Button, Caption, Overline). Discover with
   `getLocalTextStylesAsync()` and use the `.id`.
3. **Every shadow uses a pre-built effect style** (`node.effectStyleId = styleId`). NEVER hardcode
   `effects: [{ type: "DROP_SHADOW", ... }]`. Discover with `getLocalEffectStylesAsync()`.

**Pre-flight, per element, before you create it:**
- [ ] Identified the source `ion-*` component → instancing THAT component (not a frame/text)?
- [ ] Every text node assigned a `textStyleId`?
- [ ] Every elevated surface assigned an `effectStyleId` (no raw shadow)?
- [ ] Colors via paint-style `fillStyleId` (no raw hex)?
- Only **layout containers** (page wrapper, section frames, grid rows) are hand-built. Everything
  with a design-system equivalent is an instance + a style.

### Failure log — 2026-06-01 (first Products build)
- **What I did wrong:** hardcoded drop shadows on every card; created text with raw Roboto
  `fontName`/`fontSize` (only colors were styled); represented many `ion-button`s as Primary-colored
  text; built `ion-segment`, `ion-input`, and `ion-avatar` as manual frames.
- **Root cause:** I optimized for screenshot-level visual fidelity and for speed across many screens,
  and rationalized each fake as "representative." The brief was *reuse the system*, so a lookalike is
  a regression, not a representation. Awkwardness of a component is never a license to skip it.
- **The fix:** the rules above, applied retroactively — shadows→effect styles, text→text styles,
  faked controls→real Button/Segment/Input/Avatar instances.

---

## 1. File & page structure

The file is a multi-app design system. Each app has its own page; screens live as top-level
frames on that page. Foundational pages:

| Page | id | What's there |
|---|---|---|
| Colors | `12606:129` | Color tokens (as **paint styles**, not variables — see §5) |
| Ionicons | `12162:0` | 1,332 icon components, named exactly e.g. `pricetags-outline` |
| Ionic Components | `12167:10` | The component library (Toolbar, Item, Card, Button, …) |
| Products | `54228:58619` | Products app screens (Product workbench built here) |
| Job Manager / Order Routing / Fulfillment / … | various | Built precedents — copy their layout patterns |

When in doubt about a pattern, **open a built screen on another app's page** (e.g. Job Manager
`Jobs / Home` = `51320:64628`) and match it.

---

## 2. The #1 trap: components are LOCAL, instance them by NODE ID

These components are **local to this file, not a published library**. Therefore:

- ❌ `importComponentByKeyAsync(key)` / `importComponentSetByKeyAsync(key)` **fail** (return null).
  The keys you can read off nodes are useless for instancing here.
- ✅ Instance via the node: `(await figma.getNodeByIdAsync(NODE_ID)).createInstance()`.
- For a **variant set**, get the specific variant **child COMPONENT's node id**, not the set's id,
  then `createInstance()` on it.
- **Cross-page instancing works**: `getNodeByIdAsync` loads a component that lives on the Ionic
  Components page even while your current page is Products. Append the instance to your frame.

---

## 3. Component map (node IDs)

Resolved on the Ionic Components page (`12167:10`). Re-verify if the library changes.

| Component | Set id | Useful variant → node id |
|---|---|---|
| Toolbar | `13002:18255` | Background=False → `0:1983`, Background=True → `0:1227` |
| Item (list item) | `13489:25153` | Media=Thumbnail `13489:24593`, Media=Icon `13489:24595`, Media=None `13489:24596`, Media=Avatar `13489:24594` |
| List (header row) | `12207:480` (COMPONENT) | text prop `Label#26161:6` |
| Card | `14232:65` | Autolayout=False `12286:92`, Autolayout=True `14232:64` |
| Searchbar | `13002:18314` | In toolbar=False `12203:13`, In toolbar=True `12977:196` |
| Select ("Select / Resting") | `12806:501` (COMPONENT) | — (see §6, natural width ≈ 343) |
| Button | `13042:0` | Default/Solid/True `0:1457`, Default/Clear/True `0:1461`, Default/Outline/True `12170:1589` (Size ∈ Small/Default/Large; Style ∈ Solid/Outline/Clear) |
| Badge | `12172:242` (COMPONENT) | text prop `Label#25719:0` |
| Chip | `13042:104` | Outline=True,State=Enabled `12214:214`; Outline=False,State=Enabled `0:1909` |
| Progress / Linear | `0:1639` (COMPONENT) | — |
| Icons (any) | Ionicons page | find by exact name, e.g. `pricetags-outline` `14126:3820`, `copy-outline` `14126:4272`, `alert-circle-outline` `14126:4828`, `cloud-download-outline` `14126:4798`, `settings-outline` `14126:3742`, `git-branch-outline` `14126:4340` |

To (re)resolve any component: on its page, `page.findAllWithCriteria({types:["COMPONENT_SET","COMPONENT"]})`
then match by `.name` or `.key`; read `.id`, `.componentPropertyDefinitions`, and (for sets) `.children`.

---

## 4. Setting text inside instances

Most components keep their text **internal** (no exposed TEXT property): Toolbar, Item, Searchbar,
Select, Button, Chip. Only **Badge** (`Label#25719:0`) and **List** (`Label#26161:6`) expose a real
text property you can `setProperties({...})`.

For the internal ones:
1. `const ts = inst.findAll(n => n.type === "TEXT" && n.visible && n.width > 1)` — **visible nodes only**.
   Components carry many *hidden* variant text nodes; selecting by index hits the wrong one.
2. Match by current placeholder content, not position. Defaults you'll see:
   - Toolbar title → `"Title"`
   - Select → label is `"Item"`, value is `"Select"`, plus a `"Badge"` (hide it: `node.visible=false`)
3. Canonical edit recipe (handles any/mixed fonts):
   ```js
   const fonts = t.getRangeAllFontNames(0, Math.max(1, t.characters.length));
   for (const f of fonts) await figma.loadFontAsync(f);
   t.characters = "New text";
   ```

---

## 5. Colors & type are STYLES (apply by id, not key)

`getLocalVariableCollectionsAsync()` is basically empty here — **don't conclude "no tokens."**
Colors are **local paint styles**; type is **local text styles**.

- Get them with `getLocalPaintStylesAsync()` / `getLocalTextStylesAsync()` → use the `.id`.
- Apply: `node.fillStyleId = paintId` (works on text & shapes), `textNode.textStyleId = textId`.
- `importStyleByKeyAsync` fails for these (local), same as components — use the local `.id`.

Paint styles: `Primary` (+Tint/Shade), `Secondary`, `Tertiary`, `Danger`, `Success`, `Warning`,
`Dark`, `Medium`, `Light`, `Icon on Primary`, `Text`, `Text - Medium`, `Black — Disabled/Inactive`,
`Surface — Snackbar`.
Text styles (Roboto): `H1..H6`, `Body 1/2`, `Subtitle 1/2`, `Button`, `Caption`, `Overline`.

There is **no** white/background/border token — for plain surfaces use white `{r:1,g:1,b:1}` and a
hairline border `{r:0.886,g:0.886,b:0.898}`. **Content background is white (NOT gray)** — the real
Ionic UI has no content background color (confirmed in review). Don't tint the content area.

---

## 6. Component-specific gotchas

- **Select** is built on Item and renders **label-left / value-right inline** (NOT a stacked label),
  with a fixed internal width ≈ **343px**. Resizing narrower pushes the value into the next cell /
  clips it. So: keep selects at ~343 and **wrap** the row, don't shrink them to fit.
- **Item** is heavyweight (≈18 nested instances; its media "Icon" is a GROUP, not a clean swap target).
  For simple rows (menu nav, result rows) **build a manual row container** and drop in design-system
  *atoms* (icon instances, Badge, Chip) instead of fighting Item internals. This still honors
  "no primitives from scratch" — you're composing the same way the Vue components do.
- **Images**: the Plugin API cannot fetch external URLs. Use a gray placeholder, or run
  `generate_figma_design` to rasterize the running web app and copy its `imageHash` values.

---

## 7. Layout rules that bite

- Set `layoutSizingHorizontal/Vertical = "FILL"/"HUG"` **after** `appendChild`. FILL needs the
  parent to be auto-layout; for a child to FILL height, the parent must have a **FIXED** primary size.
- `resize()` resets sizing modes to FIXED — call it before re-applying HUG/FILL.
- Watch `clipsContent`: a too-short container with `clipsContent=true` silently crops children
  (this clipped the search card until the content frame was set to FILL the viewport height).
- Position top-level frames away from existing content; scan `page.children` for clear space.

---

## 8. The house screen pattern (1440 desktop split-pane) 🟡

Matches Job Manager / Order Routing / Fulfillment. 🟡 confirm 1440-desktop is the target vs mobile 375.

```
Wrapper frame  1440 × ~1156, white, layout NONE
├─ Menu rail   304 × full-H, white, 1px right border, VERTICAL
│   ├─ Header   56h: app name (e.g. "Products"), Roboto Medium 20, bottom border
│   └─ Nav rows  HORIZONTAL, icon(24) + label(16); active row uses Primary fill style
└─ Main column 1136 × full-H, VERTICAL (FIXED height)
    ├─ Toolbar  instance, FILL width — strip the generic hamburger/share/＋/search to match the app
    └─ Content  FILL height, WHITE bg (no gray), padding 16, gap 16
        ├─ Cards  white, radius 8, subtle drop shadow
        └─ Lists  white radius-8 surface; rows = manual containers w/ full-width bottom dividers
```

Build order that worked: wrapper skeleton → menu rail → toolbar text → search card → results list,
**screenshotting after each section** (`get_screenshot` at maxDimension ≥1200, or `node.screenshot({scale})`).

---

## 9. Validate as you go

- After each section, screenshot and look specifically for: clipped/overlapping text, placeholder
  text left unset ("Title"/"Item"/"Select"), wrong variant, cramped neighbors.
- `use_figma` is **atomic** — a thrown error makes zero changes. Read the error, fix, retry; don't
  blind-retry. Keep each call to a handful of logical operations.

---

## 10. Reading review feedback (important for the "no-waiting" goal)

The Plugin API can read **Dev Mode annotations** (`node.annotations`) but **NOT collaborative
comment pins**. So:

- 🟢 **Preferred:** leave feedback as **Dev Mode annotations** on the specific node — an agent can
  read these directly and self-correct.
- Alternatively, capture recurring feedback as a rule in **this guide** so it's prevented, not repeated.
- Comment *pins* require the Figma REST API (`GET /v1/files/:key/comments`) with a token — only
  usable if a token is provided to the agent.

---

## How to extend this guide

When a review comment or a new screen teaches you something, add it here as a rule (with the node
id / recipe), so it becomes prevention instead of a repeated correction. Treat this file as the
single source of truth for "how to build HC Ionic screens in Figma."

---

## 11. Review round 1 — lessons (Product workbench)

Real corrections from a design review; treat as rules:

1. **Lists must be real `ion-list` + `List` (list-header)** — not a hand-built card with a custom
   header row. Build the results area as a flush white VERTICAL frame ("ion-list"), with a `List`
   header on top.
2. **Row items must be real `Item` instances, detached, then customized** — don't hand-build rows.
   This is the canonical technique for adding badges/chips to a list item:
   ```js
   const det = itemInstance.detachInstance();          // peels ONLY the top layer
   let g=0; while(g++<8){ const ins=det.findAll(n=>n.type==="INSTANCE"); if(!ins.length) break;
     for(const i of ins){ try{ i.detachInstance(); }catch(e){} } }   // recursively flatten
   // now everything is frames/text/vectors and fully editable
   ```
   - After flatten, **find by NAME** (ids change). Key names inside an Item: `Content / Start`
     (the VERTICAL label stack), `List item title`, `List item subtitle`, `Secondary text 1/2`,
     `Overline`, `Lables` (HORIZONTAL: start + end), `Content / End`, `Media`.
   - `List item subtitle` defaults to **`visible:false`** — set `.visible = true` after setting text.
   - Names repeat across `Content / Start` and `Content / End` — **scope finds** to the right
     subtree (`cstart.findOne(...)`), don't search the whole row.
   - Add badges/chips by `appendChild` into `Content / Start` (they sit below the subtitle).
   - The thumbnail Media flattens to a neutral placeholder shape — fine; real images need
     `generate_figma_design`.
   - Build one row, then **`clone()`** it for the rest and edit text — clones of flattened frames
     are safe (no instance surprises).
3. **The `List` component is a full sample list** (header + "List Divider" + ~8 dummy `Item`s), not
   a bare header. After instancing, **detach it and keep only the `List Header` child**, removing
   `List Divider` / `padding` / dummy `Item`s.
4. **No content background color** — see §5/§8. White, not gray.

## 12. Plugin API property access THROWS on unknown props

The Figma node proxy **throws** when you read a property a node type doesn't have (e.g.
`rectangle.findAll`, `rectangle.layoutMode`) — it does NOT return `undefined`. So:

- ❌ `node.findAll ? ... : ...`   → throws on a RECTANGLE
- ✅ `("findAll" in node) ? ... : ...`
- Same for `layoutMode`, `children`, `fills`, etc. Always guard with `"prop" in node`.

## 13. Reuse the screen shell across sibling screens

The menu rail + toolbar are identical on every app screen. Build one screen, then **`clone()` the
whole wrapper** for each sibling; per screen only: reposition, change the toolbar title text, move
the active state to the right nav row, and replace the content area. Don't rebuild the shell.
Likewise, **clone a built detached row** (or any composed unit) across screens and just edit text,
rather than rebuilding it — clones of flattened frames are safe and fast.

**Navigation menu — the correct pattern (do NOT hand-build nav rows):**
1. Instance the base **`Menu / Side / Resting`** (`0:3321`). It ships with a header Toolbar + 5
   `Item` nav rows (375 wide incl. an overlay scrim; the surface is 304).
2. **Override in place — never detach.** Set the header title text; for each nav `Item`, set its
   visible label (the TEXT whose `parent.name === "Content / Start"`) and `swapComponent` its
   **leading** icon — pick the **leftmost ~24px** icon instance (sorting by `absoluteTransform[0][2]`),
   because each item also has a trailing caret/select icon that must NOT be the one you swap.
3. **Wrap once:** `figma.createComponent()` → 304×1156, `clipsContent` (clips the scrim), white fill +
   1px right border → `appendChild` the configured menu instance at (0,0). Name it `Products / Menu`.
   It stays linked to the base Menu (nested instance) so DS updates still propagate.
4. **Reuse:** instance `Products / Menu` on every screen at (0,0); delete the old rail.
5. Per-screen active highlight (if needed) is an instance-level override, not a separate component.

## 14b. Verified token & control recipes (USE THESE — rules 1–3 made executable)

**Effect styles** (`node.effectStyleId = id`) — local IDs:
`2dp — Elevation` = `S:ee244e4f6931937cd14aba2308b37b0905e8943d,` (default card elevation;
1dp/3dp…24dp also exist). `Lines: Full` = item divider inner-shadow.

**Text styles** (`node.textStyleId = id`) — map content size → style, local IDs:
H3(22)=`S:a21ab79d…,` · H4(20)=`S:c2284b9c…,` · H5(18)=`S:86f24d23…,` · Subtitle1(16)=`S:27e16fe6…,`
· Body2(14)=`S:3a8747be…,` · Caption(12)=`S:cf4a8a63…,` · Overline(10)=`S:4215a9e9…,`. Load Roboto
Regular/Medium/Light before applying. (Full keys are in §5/the discovery output.)

**Button** (set `13042:0`) — instance the variant node, set its visible text:
Default/Solid `0:1457`, Default/Outline `12170:1589`, Default/Clear `0:1461`. Every `ion-button`
(including text "links" like "Open", "Go to OMS", "Add more") → one of these. Never colored text.

**Segment** = a row of **Segment Button** instances (active `25986:89413`, inactive `25986:89418`).
- `Label#25986:44` is a TEXT prop (`setProperties`). `Active`/`Disable` are variants.
- The icon is an **INSTANCE_SWAP** (`Icon#25986:40`), NOT a boolean — for a text-only segment,
  hide the nested icon node (`iconNode.visible = false`); the icon-top auto-layout then collapses.

**Input** (set `13309:10`) — Default-Label/Filled=False `12207:9` (also Fixed `12207:8`,
Floating `0:3834`). Set the visible `Label` and `Placeholder` text nodes; hide `Helper & error text`.

**Switch/Toggle** `13002:18079` (On/Enabled variants) · **Checkbox** `13002:17954` ·
**Radio** `13002:18016` · **Card heading** (subtitle+title) `13438:46`. There is **no** standalone
Avatar component — a circle is acceptable there (it's a container, not a control).

## 14. More Plugin API gotchas (build batch)

- **`getNodeByIdAsync` takes a NODE ID, not a component `key`.** Passing a key returns `null`
  (then `.createInstance()` throws). Keep node IDs (e.g. `13489:24593`) for instancing; keys are
  only for the (here non-working) `importByKey` path. Resolve node IDs once per component you need.
- **Auto-layout alignment enums are strict:** `primaryAxisAlignItems` ∈ `MIN|CENTER|MAX|SPACE_BETWEEN`;
  `counterAxisAlignItems` ∈ `MIN|CENTER|MAX|BASELINE`. `"START"`/`"END"` throw. A thrown value inside
  a `try/catch` per card silently yields an **empty card** — if cards render blank, suspect a bad enum.
- **Wrap math includes the parent's padding.** For N FIXED-width children to fit per row, they must
  satisfy `N*w + (N-1)*gap ≤ containerInnerWidth` (container width − left/right padding). Being a few
  px over silently drops to one-per-row. Size children with margin to spare.
- **Section headers above card grids:** a bold `Text` (Medium ~18) reads as an `ion-list-header`
  without dragging in the `List` component's sample items. Reserve the `List` component for actual lists.
