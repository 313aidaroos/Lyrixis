-- Public catalog: recordings + lyrics for search/view on the live site.
-- Seed is public-domain / traditional works only (not commercial copyrighted lyrics).
-- RLS: anon + authenticated can SELECT. No public writes.

create table if not exists public.catalog_recordings (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  title text not null,
  artist text not null,
  album text,
  isrc text,
  iswc text,
  upc text,
  year integer,
  language text,
  label text,
  writers text[] not null default '{}',
  duration_seconds numeric(10,3),
  source text not null default 'public_domain',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_recordings_title_idx
  on public.catalog_recordings (lower(title));
create index if not exists catalog_recordings_artist_idx
  on public.catalog_recordings (lower(artist));
create index if not exists catalog_recordings_isrc_idx
  on public.catalog_recordings (isrc);
create index if not exists catalog_recordings_iswc_idx
  on public.catalog_recordings (iswc);

create table if not exists public.catalog_lyrics (
  recording_id uuid primary key references public.catalog_recordings(id) on delete cascade,
  license text not null check (license in ('public_domain', 'original', 'licensed')),
  license_note text,
  full_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalog_recordings enable row level security;
alter table public.catalog_lyrics enable row level security;

drop policy if exists catalog_recordings_read on public.catalog_recordings;
create policy catalog_recordings_read
  on public.catalog_recordings
  for select
  to anon, authenticated
  using (true);

drop policy if exists catalog_lyrics_read on public.catalog_lyrics;
create policy catalog_lyrics_read
  on public.catalog_lyrics
  for select
  to anon, authenticated
  using (true);

grant select on public.catalog_recordings to anon, authenticated;
grant select on public.catalog_lyrics to anon, authenticated;

insert into public.catalog_recordings
  (public_id, title, artist, album, isrc, iswc, upc, year, language, label, writers, duration_seconds, source)
values
  (
    'rec_amazing_grace',
    'Amazing Grace',
    'Traditional',
    'Lyrixis Public Domain Catalog',
    null,
    null,
    null,
    1779,
    'en',
    'Public domain',
    array['John Newton'],
    180,
    'public_domain'
  ),
  (
    'rec_auld_lang_syne',
    'Auld Lang Syne',
    'Traditional',
    'Lyrixis Public Domain Catalog',
    null,
    null,
    null,
    1788,
    'en',
    'Public domain',
    array['Robert Burns'],
    150,
    'public_domain'
  ),
  (
    'rec_scarborough_fair',
    'Scarborough Fair',
    'Traditional',
    'Lyrixis Public Domain Catalog',
    null,
    null,
    null,
    1670,
    'en',
    'Public domain',
    array['Traditional'],
    210,
    'public_domain'
  ),
  (
    'rec_greensleeves',
    'Greensleeves',
    'Traditional',
    'Lyrixis Public Domain Catalog',
    null,
    null,
    null,
    1580,
    'en',
    'Public domain',
    array['Traditional'],
    200,
    'public_domain'
  ),
  (
    'rec_oh_susanna',
    'Oh! Susanna',
    'Stephen Foster',
    'Lyrixis Public Domain Catalog',
    null,
    null,
    null,
    1848,
    'en',
    'Public domain',
    array['Stephen Foster'],
    140,
    'public_domain'
  ),
  (
    'rec_home_on_the_range',
    'Home on the Range',
    'Traditional',
    'Lyrixis Public Domain Catalog',
    null,
    null,
    null,
    1873,
    'en',
    'Public domain',
    array['Brewster Higley'],
    165,
    'public_domain'
  )
on conflict (public_id) do update set
  title = excluded.title,
  artist = excluded.artist,
  album = excluded.album,
  year = excluded.year,
  language = excluded.language,
  label = excluded.label,
  writers = excluded.writers,
  duration_seconds = excluded.duration_seconds,
  source = excluded.source,
  updated_at = now();

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select id, 'public_domain', 'Public-domain hymn (John Newton, 1779).',
$lyric$Amazing grace! How sweet the sound
That saved a wretch like me.
I once was lost, but now am found;
Was blind, but now I see.

'Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear
The hour I first believed.

Through many dangers, toils, and snares,
I have already come;
'Tis grace hath brought me safe thus far,
And grace will lead me home.

The Lord has promised good to me,
His word my hope secures;
He will my shield and portion be,
As long as life endures.$lyric$
from public.catalog_recordings where public_id = 'rec_amazing_grace'
on conflict (recording_id) do update set
  license = excluded.license,
  license_note = excluded.license_note,
  full_text = excluded.full_text,
  updated_at = now();

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select id, 'public_domain', 'Public-domain poem (Robert Burns, 1788).',
$lyric$Should auld acquaintance be forgot,
And never brought to mind?
Should auld acquaintance be forgot,
And auld lang syne?

For auld lang syne, my dear,
For auld lang syne,
We'll take a cup of kindness yet,
For auld lang syne.

And surely ye'll be your pint-stowp,
And surely I'll be mine;
And we'll take a cup o' kindness yet,
For auld lang syne.$lyric$
from public.catalog_recordings where public_id = 'rec_auld_lang_syne'
on conflict (recording_id) do update set
  license = excluded.license,
  license_note = excluded.license_note,
  full_text = excluded.full_text,
  updated_at = now();

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select id, 'public_domain', 'English folk ballad; traditional lyrics in the public domain.',
$lyric$Are you going to Scarborough Fair?
Parsley, sage, rosemary, and thyme.
Remember me to one who lives there,
She once was a true love of mine.

Tell her to make me a cambric shirt,
Parsley, sage, rosemary, and thyme.
Without no seams nor needle work,
Then she'll be a true love of mine.

Tell her to find me an acre of land,
Parsley, sage, rosemary, and thyme.
Between the salt water and the sea strand,
Then she'll be a true love of mine.$lyric$
from public.catalog_recordings where public_id = 'rec_scarborough_fair'
on conflict (recording_id) do update set
  license = excluded.license,
  license_note = excluded.license_note,
  full_text = excluded.full_text,
  updated_at = now();

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select id, 'public_domain', 'Tudor-era English song; traditional lyrics in the public domain.',
$lyric$Alas, my love, you do me wrong
To cast me off discourteously,
For I have loved you well and long,
Delighting in your company.

Greensleeves was all my joy,
Greensleeves was my delight,
Greensleeves was my heart of gold,
And who but my lady Greensleeves.

I have been ready at your hand
To grant whatever you would crave;
I have both wagered life and land,
Your love and good-will for to have.$lyric$
from public.catalog_recordings where public_id = 'rec_greensleeves'
on conflict (recording_id) do update set
  license = excluded.license,
  license_note = excluded.license_note,
  full_text = excluded.full_text,
  updated_at = now();

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select id, 'public_domain', 'Stephen Foster, 1848. Work is in the public domain.',
$lyric$I come from Alabama with my banjo on my knee,
I'm going to Louisiana, my true love for to see.
It rained all night the day I left, the weather it was dry,
The sun so hot I froze to death, Susanna, don't you cry.

Oh! Susanna, oh don't you cry for me,
For I come from Alabama with my banjo on my knee.

I had a dream the other night, when everything was still,
I thought I saw Susanna coming down the hill.
The buckwheat cake was in her mouth, the tear was in her eye,
Says I, I'm coming from the South, Susanna, don't you cry.$lyric$
from public.catalog_recordings where public_id = 'rec_oh_susanna'
on conflict (recording_id) do update set
  license = excluded.license,
  license_note = excluded.license_note,
  full_text = excluded.full_text,
  updated_at = now();

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select id, 'public_domain', 'Brewster Higley, 1873. Work is in the public domain.',
$lyric$Oh, give me a home where the buffalo roam,
Where the deer and the antelope play,
Where seldom is heard a discouraging word,
And the skies are not cloudy all day.

Home, home on the range,
Where the deer and the antelope play,
Where seldom is heard a discouraging word,
And the skies are not cloudy all day.

Where the air is so pure, the zephyrs so free,
The breezes so balmy and light,
That I would not exchange my home on the range
For all of the cities so bright.$lyric$
from public.catalog_recordings where public_id = 'rec_home_on_the_range'
on conflict (recording_id) do update set
  license = excluded.license,
  license_note = excluded.license_note,
  full_text = excluded.full_text,
  updated_at = now();
