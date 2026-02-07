# Strudel Studio - Improvement Plan

## Executive Summary

Strudel Studio is a well-structured Next.js application with a clean UI and solid foundation. However, it has several critical bugs (non-functional volume control, SSE parsing race conditions), significant UX gaps (no persistence, missing error boundaries), and accessibility issues that should be addressed before broader release. The codebase is maintainable but lacks tests and has some technical debt.

---

## Critical (Fix Now)

### 🔴 Volume Control Doesn't Work
- [ ] **Volume slider is purely cosmetic** - `setVolumeValue()` in CodePanel.tsx only updates React state, never calls the actual `setVolume()` function from strudel.ts
- [ ] **masterGainNode is never connected** - In strudel.ts:17, `masterGainNode` is declared but never created or connected to the audio graph
- **Files:** `src/components/CodePanel.tsx:12`, `src/lib/strudel.ts:17,133-138`
- **Fix:** Create gain node during init, connect to audio output, call `setVolume()` when slider changes

### 🔴 SSE Parsing Race Condition
- [ ] **Buffer cleared prematurely** - In ChatPanel.tsx:107, `parseSSE()` sets `buffer = ''` but SSE events can be split across chunks, causing data loss
- [ ] **Incomplete events silently discarded** - If a chunk ends mid-event (e.g., `event: complete\ndata: {"conten`), the partial data is lost
- **File:** `src/components/ChatPanel.tsx:94-117`
- **Fix:** Only consume complete events from buffer, keep incomplete data for next chunk

### 🔴 Keyboard Shortcut Has Stale Closure
- [ ] **Cmd+Enter uses stale code/state** - The `handleKeyDown` effect in CodePanel.tsx depends on `currentCode` and `isPlaying` but they're not in the dependency array, causing stale closures
- **File:** `src/components/CodePanel.tsx:64-72`
- **Fix:** Add `handlePlay` to dependencies, or use refs for current values

### 🔴 No Error Boundary
- [ ] **Entire app crashes on component error** - No React Error Boundary wrapping the main components
- [ ] **CodeMirror errors crash everything** - Invalid code evaluation can throw and isn't caught at component level
- **Files:** `src/app/page.tsx`, `src/components/CodePanel.tsx`
- **Fix:** Add error boundaries around ChatPanel and CodePanel

---

## High Priority (This Week)

### 🟠 No Data Persistence
- [ ] **Chat history lost on refresh** - Messages stored only in Zustand memory store
- [ ] **Code lost on refresh** - User's work disappears on page reload
- **File:** `src/lib/store.ts`
- **Fix:** Add Zustand persist middleware with localStorage, or use Supabase (already a dependency)

### 🟠 Strudel Audio Context Not Cleaned Up
- [ ] **Audio context leaks on unmount** - No cleanup in CodePanel's useEffect, could cause issues with hot reloading or navigation
- [ ] **Samples stay loaded** - `samplesLoaded` flag persists but samples might need reload after context close
- **File:** `src/lib/strudel.ts`, `src/components/CodePanel.tsx`
- **Fix:** Add cleanup function that closes audio context, reset flags

### 🟠 Code Duplication: extractCode
- [ ] **Same function in two files** - `extractCode()` exists in both `store.ts:74-77` and `validator.ts:49-52` (named `extractCodeFromMarkdown`)
- **Fix:** Export from one location, import in other

### 🟠 Missing Loading States
- [ ] **No initial page loading indicator** - White flash before content loads
- [ ] **No skeleton UI** - Could show placeholder content while hydrating
- **File:** `src/app/page.tsx`, `src/app/layout.tsx`
- **Fix:** Add loading.tsx or Suspense boundaries with skeletons

### 🟠 Validation Warnings Never Shown to User
- [ ] **Warnings generated but discarded** - `validateStrudelCode()` returns warnings but ChatPanel only uses `validated` boolean
- [ ] **Agent sees warnings, user doesn't** - Validator sends warnings to Claude but user never sees them
- **Files:** `src/lib/validator.ts`, `src/app/api/generate/route.ts`
- **Fix:** Include warnings in SSE response, display in ChatMessage metadata

### 🟠 Hard-coded AI Model
- [ ] **Model version embedded in route files** - `claude-sonnet-4-20250514` hard-coded in two places
- **Files:** `src/app/api/chat/route.ts:28`, `src/app/api/generate/route.ts:89`
- **Fix:** Move to environment variable or config file

---

## Medium Priority (Backlog)

### 🟡 Accessibility (a11y) Issues
- [ ] **No ARIA labels on interactive elements** - Play/Stop button, mode toggle, suggestion buttons lack proper labels
- [ ] **No focus management** - After sending message, focus doesn't return to input
- [ ] **Volume slider not keyboard accessible** - Can't adjust with arrow keys properly, no ARIA
- [ ] **Color contrast** - Some zinc-500 text on zinc-950 may fail WCAG AA
- [ ] **No skip navigation link** - Screen readers must traverse entire header
- **Files:** `src/components/CodePanel.tsx`, `src/components/ChatPanel.tsx`

### 🟡 Mobile UX Limitations
- [ ] **Can't see code while chatting** - Must switch tabs, no split view option
- [ ] **No haptic feedback** - Play/Stop could vibrate on mobile
- [ ] **Tab bar wastes vertical space** - Could be collapsible or use gestures
- **File:** `src/app/page.tsx`

### 🟡 No Undo/Redo UI in Editor
- [ ] **CodeMirror has history but no buttons** - Basic setup exists but no visual controls
- [ ] **Keyboard shortcuts not documented** - Users don't know Cmd+Z works
- **File:** `src/components/CodePanel.tsx`

### 🟡 Textarea Auto-resize Layout Thrashing
- [ ] **Height recalculated on every input** - `onInput` handler causes reflow
- **File:** `src/components/ChatPanel.tsx:290-294`
- **Fix:** Use CSS `field-sizing: content` or debounce resize

### 🟡 Rate Limiting UX
- [ ] **No proactive rate limit warning** - Users only see error after it happens
- [ ] **No retry-after indication** - 429 error shown but no timing info
- **Files:** `src/app/api/chat/route.ts`, `src/components/ChatPanel.tsx`

### 🟡 Duplicate Font Loading
- [ ] **Inter loaded twice** - Via `@import url()` in globals.css AND Next.js font module in layout.tsx
- **Files:** `src/app/globals.css:2`, `src/app/layout.tsx:4-7`
- **Fix:** Remove CSS import, use only Next.js font optimization

### 🟡 Console Errors Not Logged to Service
- [ ] **Only console.error used** - No error tracking service integration
- [ ] **Strudel errors especially opaque** - `[Strudel] Evaluation error:` logs but user gets generic message
- **Files:** Throughout codebase

---

## Low Priority (Nice to Have)

### 🟢 No Inline Syntax Error Highlighting
- [ ] **Errors shown in banner only** - CodeMirror could underline problem areas
- **File:** `src/components/CodePanel.tsx`

### 🟢 Beta Badge is Static
- [ ] **Could link to changelog or version info** - Currently just decorative
- **File:** `src/app/page.tsx:28-30`

### 🟢 No Share/Export Functionality
- [ ] **Can't share track URLs** - No way to link to a specific pattern
- [ ] **Can't export audio** - Play-only, no download option

### 🟢 Message IDs Could Collide
- [ ] **ID generation uses Date.now() + random** - Theoretically could collide under high load
- **File:** `src/lib/store.ts:43`
- **Fix:** Use crypto.randomUUID()

### 🟢 Suggestion Buttons Not Memoized
- [ ] **SUGGESTIONS array recreated on render** - Minor but easy to fix with useMemo or moving outside component
- **File:** `src/components/ChatPanel.tsx:11-16`

### 🟢 TypeScript `any` Usage
- [ ] **strudelRepl typed as `any`** - Loses type safety for Strudel REPL instance
- **File:** `src/lib/strudel.ts:16`
- **Fix:** Create proper type definition or use Strudel's exported types

---

## Feature Ideas

### New Functionality
- [ ] **Save/Load patterns** - localStorage for quick saves, Supabase for cloud sync
- [ ] **Pattern library/browser** - Gallery of example patterns to start from
- [ ] **Audio export** - Render to WAV/MP3 (Strudel supports this)
- [ ] **Waveform visualization** - Show audio output in real-time
- [ ] **MIDI input support** - Connect external controllers
- [ ] **Template system** - Pre-made starting points by genre
- [ ] **Chat history panels** - Multiple conversations, switch between them
- [ ] **Keyboard shortcut help modal** - Show available shortcuts
- [ ] **Copy as URL** - Encode pattern in URL for sharing
- [ ] **Playback speed control** - 0.5x to 2x speed adjustment

### Collaboration
- [ ] **Real-time collaboration** - Multiplayer cursors like Figma
- [ ] **Share session links** - Invite others to listen/edit
- [ ] **Comments on code** - Annotate specific lines

### AI Features
- [ ] **"Explain this code" button** - Have AI explain selected code
- [ ] **"Make it more X" quick actions** - Faster, louder, more complex
- [ ] **Style transfer** - "Make this sound more like techno"
- [ ] **Multiple AI model options** - Let users choose Claude/GPT

---

## Technical Debt

### Testing
- [ ] **No unit tests** - Zero test files in project
- [ ] **No E2E tests** - No Playwright/Cypress setup
- [ ] **No API route tests** - SSE streaming especially needs testing
- **Fix:** Add Vitest for unit tests, Playwright for E2E

### Code Quality
- [ ] **Inconsistent error handling** - Some try/catch, some .catch(), some nothing
- [ ] **No TypeScript strict mode** - Could enable stricter checks
- [ ] **Magic numbers** - BPM calculations, timeouts, etc. not as named constants

### Bundle & Performance
- [ ] **Large bundled-skills.ts** - 50KB+ of genre data loaded on every request
- [ ] **No code splitting for routes** - API routes could be more modular
- [ ] **Strudel packages loaded eagerly** - Could lazy-load on first play
- **Fix:** Dynamic imports, move genre data to separate API endpoint

### DevOps
- [ ] **No visible CI/CD config** - No GitHub Actions, Vercel config, etc.
- [ ] **No environment validation** - Missing API keys discovered at runtime
- [ ] **No health check endpoint** - Can't easily verify deployment
- **Fix:** Add `/api/health` endpoint, zod env validation

### Documentation
- [ ] **No README** - Project has no documentation
- [ ] **No JSDoc comments** - Functions undocumented
- [ ] **No architecture decision records** - Why Zustand vs Redux, etc.

---

## Quick Wins (< 30 min each)

1. **Fix volume control** - Connect state to actual `setVolume()` call
2. **Remove duplicate font import** - Delete line 2 from globals.css
3. **Add ARIA labels** - `aria-label` on Play, Stop, mode toggle buttons
4. **Export extractCode from one place** - Delete duplicate in validator.ts
5. **Move model to env var** - Create `ANTHROPIC_MODEL` env variable
6. **Add crypto.randomUUID** - Replace Date.now() ID generation
7. **Add basic README** - Setup instructions, architecture overview

---

## Recommended Priority Order

1. **Volume control** - Users will think it's broken
2. **SSE race condition** - Can cause lost messages
3. **Keyboard shortcut closure** - Causes confusing behavior
4. **Error boundaries** - Prevents total crashes
5. **Persistence** - Major UX improvement
6. **Accessibility** - Required for production
7. **Tests** - Required before major changes
