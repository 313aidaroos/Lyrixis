// Canonical Apixis-family webhook path (https://<domain>/api/stripe/webhook).
// Shares the exact handler with /api/webhooks/stripe so both registrations work.
export { POST, runtime } from "@/app/api/webhooks/stripe/route";
