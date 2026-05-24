import { dispatchSupportRequest } from "./dispatch.js";
import { MemoryRateLimiter, type RateLimitDecision, type RateLimitOptions } from "./rateLimit.js";
import { validateSupportRequest } from "./validation.js";
import type { DispatchResult, ProjectPolicy, SupportAdapter, SupportRequestInput, ValidationResult } from "./types.js";

export interface SupportRequestHandlerOptions {
  policy: ProjectPolicy;
  adapters: SupportAdapter[];
  limiter?: MemoryRateLimiter;
  rateLimit?: Omit<RateLimitOptions, "now">;
  now?: () => number;
}

export interface SupportRequestHandlerResult {
  ok: boolean;
  refId?: string;
  redacted?: boolean;
  validation?: ValidationResult<SupportRequestInput>;
  rateLimit?: RateLimitDecision;
  results?: DispatchResult[];
  errors?: string[];
}

export function createSupportRequestHandler(options: SupportRequestHandlerOptions): (request: Request) => Promise<Response> {
  const limiter = options.limiter ?? new MemoryRateLimiter();

  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return json({ ok: false, errors: ["method must be POST"] }, 405);
    }

    let input: SupportRequestInput;
    try {
      input = normalizeInput((await request.json()) as Partial<SupportRequestInput>, request);
    } catch {
      return json({ ok: false, errors: ["request body must be valid JSON"] }, 400);
    }

    if (options.rateLimit) {
      const rateOptions: RateLimitOptions = { ...options.rateLimit };
      const now = options.now?.();
      if (now !== undefined) rateOptions.now = now;
      const rateLimit = limiter.check(rateLimitKey(input, request), rateOptions);
      if (!rateLimit.allowed) return json({ ok: false, rateLimit, errors: ["rate limit exceeded"] }, 429);
    }

    const validated = validateSupportRequest(input, options.policy);
    if (!validated.ok) return json({ ok: false, errors: validated.errors }, 400);

    const results = await dispatchSupportRequest(validated.value, options.adapters);
    return json({
      ok: results.every((result) => result.ok),
      refId: validated.value.refId,
      redacted: validated.value.redacted,
      results
    });
  };
}

function normalizeInput(input: Partial<SupportRequestInput>, request: Request): SupportRequestInput {
  return {
    ...input,
    origin: input.origin ?? request.headers.get("origin") ?? "",
    context: {
      ...input.context,
      ip: input.context?.ip ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: input.context?.userAgent ?? request.headers.get("user-agent") ?? undefined
    }
  } as SupportRequestInput;
}

function rateLimitKey(input: SupportRequestInput, request: Request): string {
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return [input.project, input.user?.id ?? input.user?.email ?? input.context?.ip ?? forwardedIp ?? "anonymous"].join(":");
}

function json(body: SupportRequestHandlerResult | { ok: false; errors: string[] }, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
