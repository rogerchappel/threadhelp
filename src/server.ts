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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, errors: ["request body must be valid JSON"] }, 400);
    }

    const shape = validateInputShape(body);
    if (!shape.ok) return json({ ok: false, errors: shape.errors }, 400);
    const input = normalizeInput(shape.value, request);

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

function validateInputShape(input: unknown): ValidationResult<Partial<SupportRequestInput>> {
  if (!isRecord(input)) return { ok: false, errors: ["request body must be a JSON object"] };

  const errors: string[] = [];
  requireString(input, "project", errors);
  requireString(input, "category", errors);
  requireString(input, "subject", errors);
  requireString(input, "message", errors);
  optionalString(input, "origin", errors);
  optionalString(input, "priority", errors);
  optionalString(input, "honeypot", errors);
  optionalString(input, "createdAt", errors);
  optionalRecord(input, "metadata", errors);
  optionalNestedRecord(input, "user", ["id", "email", "name"], errors);
  optionalNestedRecord(input, "context", ["app", "url", "userAgent", "browser", "version", "plan", "orgId", "ip"], errors);

  if (input.attachments !== undefined) {
    if (!Array.isArray(input.attachments)) {
      errors.push("attachments must be an array when provided");
    } else {
      input.attachments.forEach((attachment, index) => {
        if (!isRecord(attachment)) {
          errors.push(`attachments[${index}] must be an object`);
          return;
        }
        requireString(attachment, "name", errors, `attachments[${index}].name`);
        requireString(attachment, "type", errors, `attachments[${index}].type`);
        if (typeof attachment.size !== "number") errors.push(`attachments[${index}].size must be a number`);
        optionalString(attachment, "url", errors, `attachments[${index}].url`);
      });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as Partial<SupportRequestInput> };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string, errors: string[], label = key): void {
  if (typeof record[key] !== "string") errors.push(`${label} must be a string`);
}

function optionalString(record: Record<string, unknown>, key: string, errors: string[], label = key): void {
  if (record[key] !== undefined && typeof record[key] !== "string") errors.push(`${label} must be a string when provided`);
}

function optionalRecord(record: Record<string, unknown>, key: string, errors: string[]): void {
  if (record[key] !== undefined && !isRecord(record[key])) errors.push(`${key} must be an object when provided`);
}

function optionalNestedRecord(record: Record<string, unknown>, key: string, stringKeys: string[], errors: string[]): void {
  const value = record[key];
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push(`${key} must be an object when provided`);
    return;
  }
  for (const nestedKey of stringKeys) optionalString(value, nestedKey, errors, `${key}.${nestedKey}`);
  if (key === "context") optionalRecord(value, "traits", errors);
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
