# Strudel Studio Browser Test

Automated browser test for Strudel Studio using OpenClaw's browser tool.

## Test Flow

### 1. Open App
```
browser action=open profile=openclaw targetUrl=http://localhost:3000
```

### 2. Wait for Page Load
```
browser action=snapshot profile=openclaw
```
Verify: Page shows "Strudel Studio", Play button visible

### 3. Test Default Code Playback
```
browser action=act profile=openclaw request='{"kind": "click", "ref": "PLAY_BUTTON_REF"}'
```
Check console for:
- ✅ `[Strudel] Initialized successfully`
- ✅ `[cyclist] start`
- ✅ `[Strudel] Code evaluated successfully`
- ❌ No `[eval] error:` messages

### 4. Stop Playback
```
browser action=act profile=openclaw request='{"kind": "click", "ref": "STOP_BUTTON_REF"}'
```

### 5. Test Agent Generation
```
browser action=act profile=openclaw request='{"kind": "click", "ref": "TECHNO_SUGGESTION_REF"}'
```
Wait ~20s for generation to complete.

### 6. Verify Generation
Take snapshot and check:
- Chat shows user message
- Chat shows assistant response with code block
- Editor shows generated code (has `setcps(` on first line)
- Validation badge shows state (green = pass, red = fail)

### 7. Test Generated Code Playback
```
browser action=act profile=openclaw request='{"kind": "click", "ref": "PLAY_BUTTON_REF"}'
```
Check console for same success markers as step 3.

## Error Conditions

### Critical Failures
- `TypeError:` in console during playback
- `[eval] error:` messages
- Page crash / blank screen
- Network errors for sample loading (should fallback to GitHub)

### Warnings (Non-blocking)
- CORS error for strudel.cc (expected, has fallback)
- `[sampler] loading sound ... took too long` (expected on first load)
- Deprecation warnings (harmless)

## Quick Test Command

For a quick smoke test, run this in OpenClaw:

```
Test Strudel Studio:
1. Open http://localhost:3000 in browser (profile=openclaw)
2. Click Play, verify audio plays (check console for [cyclist] start)
3. Click Stop
4. Click "Techno beat 130 BPM" suggestion
5. Wait 20s for generation
6. Click Play, verify generated code plays
7. Report: PASS if both playback tests succeeded, FAIL with console errors if not
```

## Ref IDs (may change)

These are typical ref IDs but check snapshot for current values:
- Play button: `e134` or `e138` or `e211`
- Stop button: `e162`
- Techno suggestion: `e52`
- Chat input: `e86`
- Volume slider: `e141` or `e145`
