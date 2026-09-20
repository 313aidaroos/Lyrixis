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

### 2. 100-Track Monthly Batch
- **SKU:** `lyrixis_batch_100_monthly`
- **Cost:** 15,000 Ixis ($150/month)
- **Type:** Recurring monthly subscription
- **Description:** Process up to 100 tracks per month with full intelligence layer.
- **Entitlement:** 100 track credits renew monthly; unused credits do not roll over.

### 3. 1,000-Track Monthly Batch (Volume Discount)
- **SKU:** `lyrixis_batch_1000_monthly`
- **Cost:** 7,500 Ixis ($75/month)
- **Type:** Recurring monthly subscription
- **Description:** Process up to 1,000 tracks per month with volume discount (50% savings per track).
- **Entitlement:** 1,000 track credits renew monthly; unused credits do not roll over.

### 4. 10,000-Track Enterprise Monthly
- **SKU:** `lyrixis_enterprise_10k_monthly`
- **Cost:** 40,000 Ixis ($400/month)
- **Type:** Recurring monthly subscription
- **Description:** Enterprise-tier processing for labels and distributors (10,000 tracks/month).
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
