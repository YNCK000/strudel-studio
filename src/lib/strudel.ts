/**
 * Strudel Audio Integration
 * 
 * Provides browser-based audio playback using Strudel's web audio packages.
 * All Strudel imports are dynamic to avoid SSR issues.
 */

// Types
export interface StrudelInstance {
  evaluate: (code: string) => Promise<void>;
  start: () => void;
  stop: () => void;
  isReady: boolean;
}

// Global state
let strudelRepl: any = null;
let strudelTranspiler: any = null;
let isInitialized = false;
let samplesLoaded = false;
let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let initProgress: 'idle' | 'audio' | 'samples' | 'ready' = 'idle';

/**
 * Get current initialization progress
 */
export function getInitProgress(): typeof initProgress {
  return initProgress;
}

/**
 * Check if we're running in the browser
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Initialize the Strudel audio engine
 * MUST be called from a user interaction (click/tap) due to browser audio policy
 */
export async function initStrudel(): Promise<StrudelInstance> {
  if (!isBrowser) {
    throw new Error('Strudel can only be initialized in the browser');
  }

  if (strudelRepl && isInitialized) {
    return {
      evaluate: evaluateCode,
      start: () => strudelRepl?.start(),
      stop: () => strudelRepl?.stop(),
      isReady: true,
    };
  }

  try {
    console.log('[Strudel] Initializing...');
    initProgress = 'audio';

    // Create audio context (requires user interaction)
    audioContext = new AudioContext();
    
    // Resume if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Dynamic imports to avoid SSR issues
    const [
      { repl },
      { evalScope },
      { transpiler },
      core,
      mini,
      webaudio,
      tonal,
    ] = await Promise.all([
      import('@strudel/core/repl.mjs'),
      import('@strudel/core/evaluate.mjs'),
      import('@strudel/transpiler'),
      import('@strudel/core'),
      import('@strudel/mini'),
      import('@strudel/webaudio'),
      import('@strudel/tonal'),
    ]);
    
    // Store transpiler for code evaluation
    strudelTranspiler = transpiler;

    // Initialize superdough (web audio output)
    await webaudio.initAudio();
    
    // Create master gain node for volume control
    const webAudioCtx = webaudio.getAudioContext();
    if (webAudioCtx && !masterGainNode) {
      masterGainNode = webAudioCtx.createGain();
      masterGainNode.gain.value = 0.8; // Default 80%
      masterGainNode.connect(webAudioCtx.destination);
      
      // Patch the destination so Strudel routes through our gain node
      // Use type assertion since setDestination may exist at runtime but not in types
      const webAudioModule = webaudio as Record<string, unknown>;
      if (typeof webAudioModule.setDestination === 'function') {
        (webAudioModule.setDestination as (dest: AudioNode) => void)(masterGainNode);
      }
    }
    
    // Register all Strudel functions in global scope
    await evalScope(
      core,
      mini,
      webaudio,
      tonal,
    );

    // Load default sample bank (dirt-samples) from strudel.cc CDN
    // This provides bd, hh, sd, cp, etc.
    if (!samplesLoaded) {
      initProgress = 'samples';
      console.log('[Strudel] Loading samples from strudel.cc...');
      try {
        await webaudio.samples('https://strudel.cc/strudel.json');
        samplesLoaded = true;
        console.log('[Strudel] Samples loaded successfully');
      } catch (sampleError) {
        console.warn('[Strudel] Failed to load remote samples, trying github fallback:', sampleError);
        try {
          // Fallback to direct github source
          await webaudio.samples('github:tidalcycles/dirt-samples');
          samplesLoaded = true;
          console.log('[Strudel] Samples loaded from github fallback');
        } catch (fallbackError) {
          console.warn('[Strudel] Could not load samples, synth sounds will still work:', fallbackError);
        }
      }
    }

    // Create the REPL instance with transpiler for proper code evaluation
    strudelRepl = repl({
      defaultOutput: webaudio.webaudioOutput,
      getTime: () => webaudio.getAudioContext().currentTime,
      transpiler: strudelTranspiler,
      beforeStart: async () => {
        // Ensure audio context is running
        const ctx = webaudio.getAudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
      },
    });

    isInitialized = true;
    initProgress = 'ready';
    console.log('[Strudel] Initialized successfully');

    return {
      evaluate: evaluateCode,
      start: () => strudelRepl?.start(),
      stop: () => strudelRepl?.stop(),
      isReady: true,
    };
  } catch (error) {
    console.error('[Strudel] Initialization failed:', error);
    initProgress = 'idle';
    throw error;
  }
}

/**
 * Evaluate and play Strudel code
 */
async function evaluateCode(code: string): Promise<void> {
  if (!strudelRepl) {
    throw new Error('Strudel not initialized. Call initStrudel() first.');
  }

  try {
    await strudelRepl.evaluate(code);
    console.log('[Strudel] Code evaluated successfully');
  } catch (error) {
    console.error('[Strudel] Evaluation error:', error);
    throw error;
  }
}

/**
 * Stop playback
 */
export function stopStrudel(): void {
  if (strudelRepl) {
    strudelRepl.stop();
    console.log('[Strudel] Playback stopped');
  }
}

/**
 * Check if Strudel is initialized
 */
export function isStrudelReady(): boolean {
  return isInitialized && strudelRepl !== null;
}

/**
 * Get the audio context (for volume control etc)
 */
export function getAudioCtx(): AudioContext | null {
  return audioContext;
}

/**
 * Set master volume (0-100)
 */
export function setVolume(value: number): void {
  const gain = Math.max(0, Math.min(1, value / 100));
  if (masterGainNode) {
    masterGainNode.gain.setValueAtTime(gain, masterGainNode.context.currentTime);
  }
}

/**
 * Get the master gain node
 */
export function getMasterGain(): GainNode | null {
  return masterGainNode;
}
