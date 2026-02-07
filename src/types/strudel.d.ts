// Type declarations for Strudel packages

declare module '@strudel/transpiler' {
  export function transpiler(code: string, options?: {
    wrapAsync?: boolean;
    addReturn?: boolean;
    emitMiniLocations?: boolean;
    emitWidgets?: boolean;
  }): {
    output: string;
    miniLocations?: number[][];
    widgets?: unknown[];
  };
}

declare module '@strudel/core/repl.mjs' {
  export function repl(options: {
    defaultOutput?: unknown;
    getTime?: () => number;
    transpiler?: unknown;
    beforeStart?: () => Promise<void>;
    onEvalError?: (error: Error) => void;
    afterEval?: () => void;
  }): {
    evaluate: (code: string, autostart?: boolean) => Promise<unknown>;
    start: () => void;
    stop: () => void;
    pause: () => void;
    toggle: () => void;
    setCps: (cps: number) => void;
  };
}

declare module '@strudel/core/evaluate.mjs' {
  export function evalScope(...modules: unknown[]): Promise<unknown[]>;
  export function evaluate(code: string, transpiler?: unknown, options?: unknown): Promise<{
    pattern: unknown;
    meta: unknown;
  }>;
}

declare module '@strudel/core' {
  export const Pattern: unknown;
  export const stack: (...patterns: unknown[]) => unknown;
  export const sequence: (...patterns: unknown[]) => unknown;
  export const cat: (...patterns: unknown[]) => unknown;
  export const silence: unknown;
  export const note: (pattern: string | unknown) => unknown;
  export const s: (pattern: string | unknown) => unknown;
  // Add other core functions as needed
}

declare module '@strudel/mini' {
  export const mini: (code: string) => unknown;
  export const getLeafLocations: (code: string, offset: number, input: string) => number[][];
  // Add other mini functions as needed
}

declare module '@strudel/webaudio' {
  export function initAudio(): Promise<void>;
  export function getAudioContext(): AudioContext;
  export function webaudioOutput(hap: unknown, deadline: number, duration: number): void;
  export function samples(url: string): Promise<void>;
  export function setDestination(destination: AudioNode): void;
}

declare module '@strudel/tonal' {
  export const scale: (name: string) => unknown;
  export const chord: (name: string) => unknown;
  // Add other tonal functions as needed
}
