# One Connected Mind

Dulitha Kariyapperuma’s single-page interactive programming and photography portfolio foundation.

## Run locally

    npm run dev -- --host 127.0.0.1

## Verify and build

    npx tsc --noEmit
    node scripts/check-brain.mjs
    npm run build

Node 24+ supports the TypeScript import in the model check. Dependencies are already installed.
Deploy all of `dist/`, including `models/`. Model loading requires HTTP, not file://.

## The experience

- Upright brain at rest. Drag to orbit; scroll or pinch to zoom; reset returns to the current lesson view.
- Cyan and amber entrances open programming and photography lessons in place, without route navigation.
- A short illumination transition leads into three selectable moments, with camera transitions and educational overlays.
- Optional Play tour advances every nine seconds and stops at the last lesson. Pause and manual selection stop playback.
- Programming includes a loop-prediction exercise; photography includes an illustrated composition experiment.
- The connection section explores imagining, evaluating, and revising, followed by verified Einstein and Cajal examples.
- Responsive layouts, keyboard-accessible alternatives, and reduced-motion support.
- Legacy /programming and /photography addresses initialize their respective journeys. Hosting needs an SPA fallback for these legacy URLs.

## Content and scope

The portfolio is a foundation: no real project case studies or photography gallery have been supplied. The experiments are implemented demonstrations, not invented client work.

Content and citations live in src/pages/Landing.tsx. Presentation lives in src/pages/journey.css. The 3D scene lives in src/components/BrainScene.tsx. General region definitions and masks live in src/lib/brainRegions.ts.

Left and right entrances are a visual metaphor, not personality types or exclusive functional divisions. Both practices involve interacting networks. The lesson order is narrative, not a sequence of isolated brain activations. Photography examples apply general neuroscience rather than photography-specific imaging. Historical hobbies are not evidence of a causal effect on scientific achievement. Einstein was a physicist and violin player, not a physician.

Sources checked 19 October 2026: MIT code-comprehension research; Queensland Health’s brain maps; University of Utah’s lateralization research summary; Beaty et al., PNAS (2018); Caltech’s Einstein Papers Project; Nobel Prize biography and Nobel Prize Museum’s Cajal exhibition. Direct source links accompany their claims in the interface.

## Anatomy and attribution

Cortical model: BrainBrowser’s example brain-surface.obj.gz. See public/models/NOTICE.txt and LICENSE.txt. Original asset preserved. Neural lines are artistic sampling, not reconstructed nerve fibers. Coordinate-based overlays are approximate teaching aids, not atlas parcellations, scans, or measured activation. The cerebellum is a schematic marker, not part of the source mesh.

`python3 scripts/prepare-cortex.py` rebuilds cortex.bin. Each of two surfaces contains uint32 vertex/index counts, float32 xyz positions, and uint32 triangle indices, little-endian. Original geometry: 81,924 vertices and 163,840 triangles.
