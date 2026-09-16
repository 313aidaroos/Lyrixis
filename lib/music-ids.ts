import { HttpError } from "@/lib/errors";

export function normalizeIsrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact) return null;
  if (!/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/.test(compact)) {
    throw new HttpError(400, "invalid_isrc", "ISRC must be 12 characters (CC-XXX-YY-NNNNN).");
  }
  return compact;
}

export function normalizeIswc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact) return null;
  if (!/^T\d{9,10}$/.test(compact)) {
    throw new HttpError(400, "invalid_iswc", "ISWC must look like T-000.000.001-0.");
  }
  return compact;
}

export function normalizeUpc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.replace(/\D/g, "");
  if (!compact) return null;
  if (!/^\d{12,14}$/.test(compact)) {
    throw new HttpError(400, "invalid_upc", "UPC/EAN must be 12–14 digits.");
  }
  return compact;
}

export function formatIsrc(isrc: string | null | undefined): string | null {
  if (!isrc) return null;
  if (isrc.length !== 12) return isrc;
  return `${isrc.slice(0, 2)}-${isrc.slice(2, 5)}-${isrc.slice(5, 7)}-${isrc.slice(7)}`;
}

export function formatIswc(iswc: string | null | undefined): string | null {
  if (!iswc) return null;
  const digits = iswc.startsWith("T") ? iswc.slice(1) : iswc;
  if (digits.length < 10) return iswc;
  const body = digits.slice(0, 9);
  const check = digits.slice(9);
  return `T-${body.slice(0, 3)}.${body.slice(3, 6)}.${body.slice(6, 9)}-${check}`;
}
