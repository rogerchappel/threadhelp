import { createHash, randomBytes } from "node:crypto";
export function createReferenceId(prefix = "TH"): string { const digest = createHash("sha256").update(`${Date.now()}:${process.pid}:${randomBytes(8).toString("hex")}`).digest("base64url").slice(0, 8).toUpperCase(); return `${prefix}-${digest}`; }
