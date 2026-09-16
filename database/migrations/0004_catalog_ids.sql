-- Unique catalog identifiers. Nulls allowed (traditional works often have none).

create unique index if not exists catalog_recordings_isrc_unique
  on public.catalog_recordings (isrc)
  where isrc is not null;

create unique index if not exists catalog_recordings_iswc_unique
  on public.catalog_recordings (iswc)
  where iswc is not null;

create unique index if not exists catalog_recordings_upc_unique
  on public.catalog_recordings (upc)
  where upc is not null;
