import { isOriginAllowed } from "./origin.js";
import { createReferenceId } from "./ref.js";
import { redactObject } from "./redact.js";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  type ProjectPolicy,
  type SupportRequest,
  type SupportRequestInput,
  type ValidationResult
} from "./types.js";

export function validateSupportRequest(input: SupportRequestInput, policy: ProjectPolicy): ValidationResult<SupportRequest> {
  const errors: string[] = [];
  const maxMessageLength = policy.maxMessageLength ?? 8000;
  const maxSubjectLength = policy.maxSubjectLength ?? 180;
  const maxAttachments = policy.maxAttachments ?? 3;
  const maxAttachmentBytes = policy.maxAttachmentBytes ?? 5 * 1024 * 1024;
  const allowedAttachmentTypes = policy.allowedAttachmentTypes ?? ["image/png", "image/jpeg", "image/webp", "text/plain"];

  if (!input.project || input.project !== policy.project) errors.push("project must match configured project policy");
  if (!input.origin || !isOriginAllowed(input.origin, policy.allowedOrigins)) errors.push("origin is not allowed for this project");
  if (!SUPPORT_CATEGORIES.includes(input.category)) errors.push("category must be one of bug, question, billing, feature, other");
  if (input.priority && !SUPPORT_PRIORITIES.includes(input.priority)) errors.push("priority must be one of low, normal, high, urgent");
  if (!input.subject?.trim()) errors.push("subject is required");
  if (input.subject && input.subject.length > maxSubjectLength) errors.push(`subject must be ${maxSubjectLength} characters or fewer`);
  if (!input.message?.trim()) errors.push("message is required");
  if (input.message && input.message.length > maxMessageLength) errors.push(`message must be ${maxMessageLength} characters or fewer`);
  if (input.user?.email && !/^\S+@\S+\.\S+$/.test(input.user.email)) errors.push("user.email must be a valid email address when provided");
  if (input.honeypot?.trim()) errors.push("honeypot must be empty");

  const attachments = input.attachments;
  if (attachments !== undefined && !Array.isArray(attachments)) {
    errors.push("attachments must be an array when provided");
  } else {
    const attachmentList = attachments ?? [];
    if (attachmentList.length > maxAttachments) errors.push(`attachments must include ${maxAttachments} files or fewer`);
    for (const [index, attachment] of attachmentList.entries()) {
      if (typeof attachment !== "object" || attachment === null || Array.isArray(attachment)) {
        errors.push(`attachments[${index}] must be an object`);
        continue;
      }
      if (typeof attachment.name !== "string" || !attachment.name.trim()) errors.push("attachment.name is required");
      if (typeof attachment.type !== "string" || !allowedAttachmentTypes.includes(attachment.type)) {
        errors.push(`attachment type is not allowed: ${String(attachment.type)}`);
      }
      if (!Number.isInteger(attachment.size) || attachment.size <= 0) errors.push("attachment.size must be a positive integer");
      if (typeof attachment.size === "number" && attachment.size > maxAttachmentBytes) {
        errors.push(`attachment ${String(attachment.name)} exceeds ${maxAttachmentBytes} bytes`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const { honeypot: _honeypot, ...safeInput } = input;
  const redacted = redactObject(safeInput);
  const value: SupportRequest = {
    ...redacted.value,
    subject: redacted.value.subject.trim(),
    message: redacted.value.message.trim(),
    priority: redacted.value.priority ?? "normal",
    createdAt: redacted.value.createdAt ?? new Date().toISOString(),
    refId: createReferenceId(),
    redacted: redacted.redacted
  };

  return { ok: true, value };
}
