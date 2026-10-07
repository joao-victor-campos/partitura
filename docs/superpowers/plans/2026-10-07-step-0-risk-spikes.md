# Step 0 — Risk Spikes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer three technical unknowns with evidence before building on them: which Conversion engine to use, whether Verovio is fast enough on the owner's Android tablet, and how "Share → app" receives a PDF on Android.

**Architecture:** Throwaway experiments in `spikes/`, each producing a findings document in `docs/spikes/`. No production code. The Conversion result becomes ADR 0007.

**Tech Stack:** Audiveris 5.10.x (CLI), Flat OMR API, Vite + TypeScript + `verovio` (npm), Capacitor (Android).

**Spec:** `docs/superpowers/specs/2026-10-07-sheet-music-app-design.md`

## Global Constraints

- The repository is created by Task 1 of the Step 1a plan. If these tests run first, run `git init` and copy the `.gitignore` from that task.
- Spike code lives only in `spikes/` and is never imported by the product.
- Every spike ends with a findings document in `docs/spikes/NNNN-<slug>.md` that contains the measurements, the device or versions used, and a one-line verdict.
- Creating the Flat account and API key, and choosing the test PDFs, are done by the owner, not by an agent.
- Do not try to get around any download protection (CAPTCHA or bot checks) on any Source (ADR 0002).

---

### Task 1: Conversion test — Audiveris vs Flat

**Files:**
- Create: `spikes/conversion/README.md` (how to rerun)
- Create: `spikes/conversion/input/` (the owner's PDFs; add to `.gitignore` if not freely licensed)
- Create: `docs/spikes/0001-conversion-engine.md`
- Create: `docs/adr/0007-conversion-engine.md`

**Interfaces:**
- Produces: the choice of engine for the Conversion interface `Scan → { notation: MusicXML, barMap: BarRegion[] | null }` that Step 5 implements.

- [ ] **Step 1: The owner picks 4 test PDFs** and puts them in `spikes/conversion/input/`:
  1. `clean-modern.pdf`: a cleanly engraved modern edition.
  2. `old-scan.pdf`: an old IMSLP scan (around 1900, slightly skewed or noisy).
  3. `dense-voices.pdf`: piano writing with several voices per hand (for example a Bach fugue or Chopin).
  4. `easy.pdf`: an easy piece, the kind the owner actually practices.

  Use the first 2 pages of each.

- [ ] **Step 2: Install Audiveris.** Download the latest 5.10.x installer for macOS from https://github.com/Audiveris/audiveris/releases and install it. Check it:

  Run: `/Applications/Audiveris.app/Contents/MacOS/Audiveris -help`
  Expected: the usage text listing `-batch`, `-export` and `-output`.

- [ ] **Step 3: Run Audiveris on all four PDFs**

  ```bash
  mkdir -p spikes/conversion/out/audiveris
  for f in spikes/conversion/input/*.pdf; do
    /Applications/Audiveris.app/Contents/MacOS/Audiveris -batch -export \
      -output spikes/conversion/out/audiveris "$f"
  done
  ls spikes/conversion/out/audiveris
  ```

  Expected: one `.omr` project file and one `.mxl` file per input. Write down the run time for each file.

- [ ] **Step 4: Check whether Audiveris gives bar positions.** Unzip one `.omr` file and look for bar and stack geometry:

  ```bash
  mkdir -p /tmp/omr && cd /tmp/omr && unzip -o "$OLDPWD/spikes/conversion/out/audiveris/clean-modern.omr" >/dev/null
  ls -R | head -50
  grep -o '<measure[^>]*>' -r . | head -5
  grep -o '<stack[^>]*>' -r . | head -5
  ```

  Record whether each measure or stack has a bounding box (x, y, width, height) per page. Also check whether the exported MusicXML has `<measure width=…>` and `<print><system-layout>`, from which bar positions could be worked out. Verdict: **exact**, **approximate**, or **none**.

- [ ] **Step 5: Run Flat OMR on the same PDFs.** The owner creates a Flat account and an API key. Following https://flat.io/developers/docs/api/omr/, submit each PDF, wait for the job, and download the MusicXML into `spikes/conversion/out/flat/`. Also save the raw job JSON responses there, and record whether any of them contain coordinates.

- [ ] **Step 6: Score the errors by hand.** Open each output (`.mxl`) in MuseScore next to the PDF. For the first 16 Bars of each file, count:

  | Error type | Counts as |
  |---|---|
  | Wrong or missing pitch / accidental | 1 per note |
  | Wrong rhythm (Note value or dot) | 1 per note |
  | Missing or extra Bar | 3 |
  | Missing tie / slur / dynamic | 1 each |
  | Voice assigned to the wrong staff | 1 per Bar |

- [ ] **Step 7: Write the findings** in `docs/spikes/0001-conversion-engine.md`:

  ```markdown
  # Conversion engine test (Audiveris vs Flat)

  Date: YYYY-MM-DD · Audiveris version: … · Flat API date: …

  | PDF | Audiveris errors (16 Bars) | Flat errors (16 Bars) | Audiveris time | Flat time |
  |---|---|---|---|---|
  | clean-modern | | | | |
  | old-scan | | | | |
  | dense-voices | | | | |
  | easy | | | | |

  Bar positions: Audiveris = exact/approximate/none · Flat = exact/approximate/none
  Cost: Audiveris = free (self-hosted Java container) · Flat = … per page / plan

  Verdict: …
  ```

- [ ] **Step 8: Record the decision as an ADR** in `docs/adr/0007-conversion-engine.md`, using the one-paragraph ADR format: what was chosen, the error totals that decided it, and whether the Bar map comes from the engine or is entered by hand.

- [ ] **Step 9: Commit**

  ```bash
  git add spikes/conversion/README.md docs/spikes/0001-conversion-engine.md docs/adr/0007-conversion-engine.md
  git commit -m "spike: compare Audiveris and Flat for Conversion"
  ```

### Task 2: Verovio speed on the owner's tablet

**Files:**
- Create: `spikes/verovio-perf/` (Vite vanilla-ts project)
- Create: `spikes/verovio-perf/src/main.ts`
- Create: `spikes/verovio-perf/public/long.musicxml`
- Create: `docs/spikes/0002-verovio-performance.md`

- [ ] **Step 1: Scaffold the project**

  ```bash
  pnpm create vite spikes/verovio-perf --template vanilla-ts
  cd spikes/verovio-perf && pnpm install && pnpm add verovio
  ```

- [ ] **Step 2: Get a long piano score.** Put a piano MusicXML file of at least 20 pages at `public/long.musicxml`. For example, export one from MuseScore, or take a long file from an OpenScore repository on GitHub.

- [ ] **Step 3: Write the timing page.** Replace `src/main.ts` with:

  ```ts
  import createVerovioModule from 'verovio/wasm';
  import { VerovioToolkit } from 'verovio/esm';

  const out = document.querySelector<HTMLDivElement>('#app')!;
  const log = (msg: string) => { out.insertAdjacentHTML('beforeend', `<p>${msg}</p>`); };

  async function run() {
    let t = performance.now();
    const module = await createVerovioModule();
    const tk = new VerovioToolkit(module);
    log(`wasm init: ${(performance.now() - t).toFixed(0)} ms`);

    const xml = await (await fetch('/long.musicxml')).text();
    tk.setOptions({
      pageWidth: window.innerWidth * 2,
      pageHeight: window.innerHeight * 2,
      scale: 40,
      svgViewBox: true,
    });

    t = performance.now();
    tk.loadData(xml);
    const pages = tk.getPageCount();
    log(`load + layout: ${(performance.now() - t).toFixed(0)} ms, pages: ${pages}`);

    t = performance.now();
    const first = tk.renderToSVG(1);
    log(`render page 1: ${(performance.now() - t).toFixed(0)} ms`);

    const times: number[] = [];
    for (let p = 2; p <= pages; p++) {
      const s = performance.now();
      tk.renderToSVG(p);
      times.push(performance.now() - s);
    }
    times.sort((a, b) => a - b);
    log(`render other pages: median ${times[Math.floor(times.length / 2)].toFixed(0)} ms, max ${times[times.length - 1].toFixed(0)} ms`);

    const holder = document.createElement('div');
    holder.innerHTML = first;
    out.appendChild(holder);
  }

  run().catch((e) => log(`ERROR: ${String(e)}`));
  ```

- [ ] **Step 4: Run it on the desktop first**

  Run: `pnpm dev --host`
  Expected: the page lists wasm init, load + layout, page 1 and other-page times, then shows the first page of music.

- [ ] **Step 5: Run it on the tablet.** On the tablet's Chrome (which uses the same engine as the Capacitor WebView), open `http://<computer-LAN-IP>:5173`. Reload 3 times and keep the median of each number. Note the tablet model and its Android and Chrome versions.

- [ ] **Step 6: Write `docs/spikes/0002-verovio-performance.md`** containing the device details, a table of the desktop and tablet numbers, and a verdict against these thresholds:
  - Load + layout + page 1 under **1500 ms**.
  - Median other-page render under **150 ms**, so pages can be rendered ahead and page turns feel instant.

  If a threshold is missed, note the mitigation to try in Step 3 of the build: render in a Web Worker, render pages lazily ahead of the reader, or lower `scale`.

- [ ] **Step 7: Commit**

  ```bash
  git add spikes/verovio-perf docs/spikes/0002-verovio-performance.md
  git commit -m "spike: measure Verovio rendering speed on the tablet"
  ```

### Task 3: Android "Share → app" for PDFs

**Files:**
- Create: `spikes/share-target/` (Vite vanilla-ts + Capacitor Android)
- Modify: `spikes/share-target/android/app/src/main/AndroidManifest.xml`
- Create: `docs/spikes/0003-android-share-target.md`

- [ ] **Step 1: Scaffold the project**

  ```bash
  pnpm create vite spikes/share-target --template vanilla-ts
  cd spikes/share-target && pnpm install
  pnpm add @capacitor/core @capacitor/android && pnpm add -D @capacitor/cli
  npx cap init "Share Spike" dev.partitura.sharespike --web-dir dist
  pnpm build && npx cap add android
  ```

- [ ] **Step 2: Pick a plugin.** Search npm for a Capacitor plugin that receives Android share and "open with" intents and supports the installed Capacitor major version (search terms: `capacitor send intent`, `capacitor share target`). Accept it only if its last release is within the past 12 months. Write the chosen package and version into the findings document. Install it with `pnpm add <package>` and run `npx cap sync android`.

- [ ] **Step 3: Declare that the app accepts PDFs.** Inside the main `<activity>` in `AndroidManifest.xml`, add:

  ```xml
  <intent-filter>
      <action android:name="android.intent.action.SEND" />
      <category android:name="android.intent.category.DEFAULT" />
      <data android:mimeType="application/pdf" />
  </intent-filter>
  <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="content" android:mimeType="application/pdf" />
  </intent-filter>
  ```

  Merge in any extra manifest entries the plugin's README asks for.

- [ ] **Step 4: Show what was received.** Following the plugin's README, read the incoming intent on app start and on resume. Display the file name, MIME type and size in bytes on the page by reading the shared file through the URI the plugin returns.

- [ ] **Step 5: Test on the tablet.** Run `npx cap run android` with the tablet connected over USB with debugging enabled. Then:
  1. In Chrome on the tablet, download any PDF, open Downloads, choose **Share → Share Spike**.
  2. In the Files app, long-press the PDF and choose **Open with → Share Spike**.

  Expected: both flows show the correct file name and byte size.

- [ ] **Step 6: Write `docs/spikes/0003-android-share-target.md`** with the plugin, its version, the manifest snippet that worked, the result of each flow, and any surprises (for example the app opening a second time, or URI permission errors).

- [ ] **Step 7: Commit**

  ```bash
  git add spikes/share-target docs/spikes/0003-android-share-target.md
  git commit -m "spike: receive shared PDFs on Android"
  ```
