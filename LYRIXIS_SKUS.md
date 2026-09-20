# Lyrixis SKUs for Apixis Wallet Catalog

**Company:** Lyrixis (lyrixis.vercel.app)  
**Contact:** lyrixis@apixis.dev  
**Catalog integration lead:** @apixiswallet  
**Currency:** Ixis (100 Ixis = $1)

---

## Proposed SKUs

### 1. Single Track Unlock
- **SKU:** `lyrixis_track_unlock`
- **Cost:** 300 Ixis ($3.00)
- **Type:** One-time purchase
- **Description:** Unlock full synced lyrics, metadata, and export formats for one track.
- **Entitlement:** Access to one track's complete intelligence layer (lyrics, timecodes, translations, exports).

### 2. Starter Monthly (100 tracks)
- **SKU:** `lyrixis_starter_monthly`
- **Cost:** 10,000 Ixis ($100/month)
- **Type:** Recurring monthly subscription
- **Description:** Starter tier: process up to 100 tracks per month.
- **Entitlement:** 100 track credits renew monthly; unused credits do not roll over.

### 3. Pro Monthly (1,000 tracks)
- **SKU:** `lyrixis_pro_monthly`
- **Cost:** 20,000 Ixis ($200/month)
- **Type:** Recurring monthly subscription
- **Description:** Pro tier: process up to 1,000 tracks per month with volume discount.
- **Entitlement:** 1,000 track credits renew monthly; unused credits do not roll over.

### 4. Enterprise Monthly (10,000 tracks)
- **SKU:** `lyrixis_enterprise_monthly`
- **Cost:** 30,000 Ixis ($300/month)
- **Type:** Recurring monthly subscription
- **Description:** Enterprise tier: process up to 10,000 tracks per month with priority processing.
- **Entitlement:** 10,000 track credits renew monthly; priority processing queue.

### 5. Custom Export (Per Track)
- **SKU:** `lyrixis_export_custom`
- **Cost:** 100 Ixis ($1.00)
- **Type:** One-time purchase
- **Description:** Export one track in a custom format (LRC, SRT, JSON, TTML, etc.).
- **Entitlement:** One custom export file download.

---

## Integration Notes

- All pricing uses **Ixis points** (100 Ixis = $1).
- Lyrixis will integrate with Apixis Wallet APIs:
  - `POST /api/v1/quotes` → create quote
  - `POST /api/v1/reservations` → reserve Ixis
  - `POST /api/v1/reservations/:id/capture` → finalize redemption
  - `POST /api/v1/reservations/:id/release` → cancel/refund
- **Paid Ixis never expires** (per family-wide policy).
- Entitlements are tracked in Lyrixis database; Wallet provides proof of redemption.

---

## Requested Action

Please add these SKUs to `lib/catalog.ts` in the Apixis Wallet repo (313aidaroos/ApixisWallet).  
Lyrixis will implement the redemption flow once `docs/INTEGRATION.md` is published.

**Message:** @apixiswallet
