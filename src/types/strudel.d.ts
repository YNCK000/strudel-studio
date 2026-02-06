// Type declarations for Strudel packages
// These packages are written in JavaScript without type definitions

declare module '@strudel/core' {
  export const Pattern: any;
  export const silence: any;
  export const stack: any;
  export const cat: any;
  export const sequence: any;
  export const note: any;
  export const s: any;
  export const sound: any;
  export const register: any;
  // Add more exports as needed
  export * from '@strudel/core';
}

declare module '@strudel/core/repl.mjs' {
  export interface ReplOptions {
    defaultOutput?: (hap: any, deadline: number, duration: number, cps: number, t: number) => Promise<void>;
    onEvalError?: (err: Error) => void;
    beforeEval?: (opts: { code: string }) => void;
    beforeStart?: () => Promise<void>;
    afterEval?: (opts: { code: string; pattern: any; meta: any }) => void;
    getTime?: () => number;
    transpiler?: (code: string, opts: any) => { output: string };
    onToggle?: (started: boolean) => void;
    editPattern?: (pattern: any) => any;
    onUpdateState?: (state: any) => void;
    sync?: boolean;
    setInterval?: typeof setInterval;
    clearInterval?: typeof clearInterval;
    id?: string;
    mondo?: boolean;
  }

  export interface ReplInstance {
    scheduler: any;
    evaluate: (code: string, autostart?: boolean, shouldHush?: boolean) => Promise<any>;
    start: () => void;
    stop: () => void;
    pause: () => void;
    setCps: (cps: number) => void;
    setPattern: (pattern: any, autostart?: boolean) => Promise<any>;
    setCode: (code: string) => void;
    toggle: () => void;
    state: any;
  }

  export function repl(options: ReplOptions): ReplInstance;
  export function getTrigger(options: { getTime: () => number; defaultOutput: any }): any;
}

declare module '@strudel/core/evaluate.mjs' {
  export const strudelScope: Record<string, any>;
  export function evalScope(...modules: any[]): Promise<any[]>;
  export function evaluate(code: string, transpiler?: any, transpilerOptions?: any): Promise<{ mode: string; pattern: any; meta: any }>;
}

declare module '@strudel/mini' {
  export * from '@strudel/mini';
}

declare module '@strudel/webaudio' {
  export function initAudio(): Promise<void>;
  export function getAudioContext(): AudioContext;
  export function webaudioOutput(hap: any, deadline: number, duration: number, cps: number, t: number): Promise<void>;
  export * from '@strudel/webaudio';
}

declare module '@strudel/tonal' {
  export * from '@strudel/tonal';
}
