export class VoicesError extends Error {
  status: number; code: string; extra?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, extra?: Record<string, unknown>) {
    super(message); this.status = status; this.code = code; this.extra = extra;
  }
}
export const deny = (code: string, msg: string, extra?: Record<string, unknown>) => new VoicesError(403, code, msg, extra);
export const bad = (code: string, msg: string, extra?: Record<string, unknown>) => new VoicesError(400, code, msg, extra);
export const notFound = (what: string) => new VoicesError(404, "not_found", `${what} not found`);
export const conflict = (code: string, msg: string) => new VoicesError(409, code, msg);
