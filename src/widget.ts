import type { SupportCategory, SupportContext, SupportRequestInput, SupportUser } from "./types.js";

export type ThreadHelpEvent = "open" | "close" | "submitted" | "error";

export interface ThreadHelpBootOptions {
  project: string;
  endpoint: string;
  origin?: string;
  greeting?: string;
  user?: SupportUser;
  traits?: Record<string, unknown>;
  context?: SupportContext;
}

export interface ThreadHelpDraft {
  category?: SupportCategory;
  subject?: string;
  message?: string;
  honeypot?: string;
  metadata?: Record<string, unknown>;
}

export interface ThreadHelpSubmitInput extends ThreadHelpDraft {
  category: SupportCategory;
  subject: string;
  message: string;
}

export interface ThreadHelpSubmitResult {
  ok: boolean;
  refId?: string;
  errors?: string[];
}

export type ThreadHelpTransport = (endpoint: string, payload: SupportRequestInput) => Promise<ThreadHelpSubmitResult>;
export type ThreadHelpListener = (payload?: unknown) => void;

export interface ThreadHelpClient {
  boot(options: ThreadHelpBootOptions): void;
  open(): void;
  close(): void;
  toggle(): void;
  prefill(draft: ThreadHelpDraft): void;
  identify(user: SupportUser, traits?: Record<string, unknown>): void;
  submit(input: ThreadHelpSubmitInput): Promise<ThreadHelpSubmitResult>;
  shutdown(): void;
  on(event: ThreadHelpEvent, listener: ThreadHelpListener): () => void;
  getState(): Readonly<ThreadHelpState>;
}

interface ThreadHelpState {
  booted: boolean;
  open: boolean;
  options: ThreadHelpBootOptions | undefined;
  draft: ThreadHelpDraft;
}

export function createThreadHelpClient(transport: ThreadHelpTransport = fetchTransport): ThreadHelpClient {
  const listeners = new Map<ThreadHelpEvent, Set<ThreadHelpListener>>();
  const state: ThreadHelpState = { booted: false, open: false, options: undefined, draft: {} };

  function emit(event: ThreadHelpEvent, payload?: unknown): void {
    for (const listener of listeners.get(event) ?? []) listener(payload);
  }

  return {
    boot(options) {
      state.booted = true;
      state.options = options;
    },
    open() {
      state.open = true;
      emit("open");
    },
    close() {
      state.open = false;
      emit("close");
    },
    toggle() {
      state.open = !state.open;
      emit(state.open ? "open" : "close");
    },
    prefill(draft) {
      state.draft = { ...state.draft, ...draft };
    },
    identify(user, traits) {
      if (!state.options) throw new Error("ThreadHelp must be booted before identify");
      state.options = { ...state.options, user, traits: { ...state.options.traits, ...traits } };
    },
    async submit(input) {
      if (!state.options) throw new Error("ThreadHelp must be booted before submit");
      const payload = buildWidgetRequest(state.options, { ...state.draft, ...input });
      const result = await transport(state.options.endpoint, payload);
      emit(result.ok ? "submitted" : "error", result);
      return result;
    },
    shutdown() {
      state.booted = false;
      state.open = false;
      state.options = undefined;
      state.draft = {};
      listeners.clear();
    },
    on(event, listener) {
      const set = listeners.get(event) ?? new Set<ThreadHelpListener>();
      set.add(listener);
      listeners.set(event, set);
      return () => set.delete(listener);
    },
    getState() {
      return { ...state, draft: { ...state.draft } };
    }
  };
}

export function buildWidgetRequest(options: ThreadHelpBootOptions, input: ThreadHelpSubmitInput): SupportRequestInput {
  const context: SupportContext = { ...options.context };
  const url = options.context?.url ?? currentUrl();
  const userAgent = options.context?.userAgent ?? currentUserAgent();
  const traits = { ...options.context?.traits, ...options.traits };

  if (url !== undefined) context.url = url;
  if (userAgent !== undefined) context.userAgent = userAgent;
  if (Object.keys(traits).length > 0) context.traits = traits;

  const payload: SupportRequestInput = {
    project: options.project,
    origin: options.origin ?? currentOrigin(),
    category: input.category,
    subject: input.subject,
    message: input.message,
    context
  };

  if (input.honeypot !== undefined) payload.honeypot = input.honeypot;
  if (options.user !== undefined) payload.user = options.user;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  return payload;
}

export function installThreadHelp(target: Record<string, unknown> = globalThis as Record<string, unknown>): ThreadHelpClient {
  const client = createThreadHelpClient();
  target.ThreadHelp = (command: string, ...args: unknown[]) => {
    const api = client as unknown as Record<string, (...values: unknown[]) => unknown>;
    if (typeof api[command] !== "function") throw new Error(`Unknown ThreadHelp command: ${command}`);
    return api[command](...args);
  };
  return client;
}

async function fetchTransport(endpoint: string, payload: SupportRequestInput): Promise<ThreadHelpSubmitResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = response.statusText ? `ThreadHelp endpoint returned ${response.status}: ${response.statusText}` : `ThreadHelp endpoint returned ${response.status}`;
    return { ok: false, errors: [message] };
  }

  try {
    return (await response.json()) as ThreadHelpSubmitResult;
  } catch {
    return { ok: false, errors: ["ThreadHelp endpoint returned invalid JSON."] };
  }
}

function currentOrigin(): string {
  return browserLocation()?.origin ?? "";
}

function currentUrl(): string | undefined {
  return browserLocation()?.href;
}

function currentUserAgent(): string | undefined {
  return browserNavigator()?.userAgent;
}

function browserLocation(): Location | undefined {
  return globalThis.window?.location;
}

function browserNavigator(): Navigator | undefined {
  return globalThis.window?.navigator;
}
