export const SUPPORT_CATEGORIES = ["bug", "question", "billing", "feature", "other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export interface SupportUser {
  id?: string;
  email?: string;
  name?: string;
}

export interface SupportContext {
  app?: string;
  url?: string;
  userAgent?: string;
  browser?: string;
  version?: string;
  plan?: string;
  orgId?: string;
  ip?: string;
  traits?: Record<string, unknown>;
}

export interface SupportAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface SupportRequestInput {
  project: string;
  origin: string;
  category: SupportCategory;
  subject: string;
  message: string;
  user?: SupportUser;
  context?: SupportContext;
  priority?: SupportPriority;
  metadata?: Record<string, unknown>;
  attachments?: SupportAttachment[];
  honeypot?: string;
  createdAt?: string;
}

export interface SupportRequest extends Omit<SupportRequestInput, "honeypot"> {
  refId: string;
  createdAt: string;
  redacted: boolean;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export interface ProjectPolicy {
  project: string;
  allowedOrigins: string[];
  maxMessageLength?: number;
  maxSubjectLength?: number;
  maxAttachments?: number;
  maxAttachmentBytes?: number;
  allowedAttachmentTypes?: string[];
}

export interface DispatchResult {
  adapter: string;
  ok: boolean;
  mode: "dry-run" | "fixture" | "live";
  destination?: string;
  reference?: string;
  payload: unknown;
  error?: string;
}

export interface SupportAdapter {
  readonly name: string;
  dispatch(request: SupportRequest): Promise<DispatchResult>;
}

export interface SlackThreadEvent {
  type: "operator_reply" | "internal_note" | "resolved" | "assigned";
  threadTs: string;
  user: string;
  text?: string;
  ts?: string;
  assignee?: string;
  sentToCustomer: boolean;
}
