-- More ID-backed public-domain catalog rows (Lyrixis catalog identifiers, not
-- CISAC/RIAA assignments). Safe to re-run: skip existing public_id / ISRC.

insert into public.catalog_recordings
  (public_id, title, artist, album, isrc, iswc, upc, year, language, label, writers, duration_seconds, source)
values
  ('rec_jingle_bells', 'Jingle Bells', 'Traditional', 'Lyrixis Public Domain Catalog',
   'QZLXA2600003', 'T0345246803', '860004200003', 1857, 'en', 'Public domain',
   array['James Lord Pierpont'], 140, 'public_domain'),
  ('rec_silent_night', 'Silent Night', 'Traditional', 'Lyrixis Public Domain Catalog',
   'QZLXA2600004', 'T0345246804', '860004200010', 1818, 'en', 'Public domain',
   array['Joseph Mohr', 'Franz Xaver Gruber'], 180, 'public_domain'),
  ('rec_the_star_spangled_banner', 'The Star-Spangled Banner', 'Traditional', 'Lyrixis Public Domain Catalog',
   'QZLXA2600005', 'T0345246805', '860004200027', 1814, 'en', 'Public domain',
   array['Francis Scott Key'], 200, 'public_domain'),
  ('rec_camptown_races', 'Camptown Races', 'Traditional', 'Lyrixis Public Domain Catalog',
   'QZLXA2600006', 'T0345246806', '860004200034', 1850, 'en', 'Public domain',
   array['Stephen Foster'], 150, 'public_domain'),
  ('rec_shenandoah', 'Shenandoah', 'Traditional', 'Lyrixis Public Domain Catalog',
   'QZLXA2600007', 'T0345246807', '860004200041', 1837, 'en', 'Public domain',
   array['Traditional'], 190, 'public_domain'),
  ('rec_twinkle_twinkle_little_star', 'Twinkle, Twinkle, Little Star', 'Traditional', 'Lyrixis Public Domain Catalog',
   'QZLXA2600008', 'T0345246808', '860004200058', 1806, 'en', 'Public domain',
   array['Jane Taylor'], 120, 'public_domain'),
  ('rec_swing_low_sweet_chariot', 'Swing Low, Sweet Chariot', 'Traditional', 'Lyrixis Public Domain Catalog',
   'QZLXA2600009', 'T0345246809', '860004200065', 1862, 'en', 'Public domain',
   array['Wallace Willis'], 160, 'public_domain'),
  ('rec_battle_hymn_of_the_republic', 'Battle Hymn of the Republic', 'Traditional', 'Lyrixis Public Domain Catalog',
   'QZLXA2600010', 'T0345246810', '860004200072', 1862, 'en', 'Public domain',
   array['Julia Ward Howe'], 210, 'public_domain')
on conflict (public_id) do nothing;

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select r.id, 'public_domain', 'Public-domain song (James Lord Pierpont, 1857).',
  $lyric$Dashing through the snow
In a one-horse open sleigh
O'er the fields we go
Laughing all the way$lyric$
from public.catalog_recordings r
where r.public_id = 'rec_jingle_bells'
on conflict (recording_id) do nothing;

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select r.id, 'public_domain', 'Public-domain carol (Mohr/Gruber, 1818).',
  $lyric$Silent night, holy night
All is calm, all is bright
Round yon virgin mother and child
Holy infant so tender and mild
Sleep in heavenly peace
Sleep in heavenly peace$lyric$
from public.catalog_recordings r
where r.public_id = 'rec_silent_night'
on conflict (recording_id) do nothing;

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select r.id, 'public_domain', 'Public-domain anthem text (Francis Scott Key, 1814).',
  $lyric$O say can you see, by the dawn's early light,
What so proudly we hailed at the twilight's last gleaming,
Whose broad stripes and bright stars through the perilous fight,
O'er the ramparts we watched, were so gallantly streaming?$lyric$
from public.catalog_recordings r
where r.public_id = 'rec_the_star_spangled_banner'
on conflict (recording_id) do nothing;

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select r.id, 'public_domain', 'Public-domain song (Stephen Foster, 1850).',
  $lyric$Camptown ladies sing this song, Doo-da, doo-da
Camptown racetrack five miles long, Oh, doo-da day
Going to run all night
Going to run all day
I bet my money on a bob-tail nag
Somebody bet on the bay$lyric$
from public.catalog_recordings r
where r.public_id = 'rec_camptown_races'
on conflict (recording_id) do nothing;

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select r.id, 'public_domain', 'Public-domain American folk song.',
  $lyric$Oh, Shenandoah, I long to hear you
Away, you rolling river
Oh, Shenandoah, I long to hear you
Away, I'm bound away
'Cross the wide Missouri$lyric$
from public.catalog_recordings r
where r.public_id = 'rec_shenandoah'
on conflict (recording_id) do nothing;

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select r.id, 'public_domain', 'Public-domain poem (Jane Taylor, 1806).',
  $lyric$Twinkle, twinkle, little star,
How I wonder what you are!
Up above the world so high,
Like a diamond in the sky.$lyric$
from public.catalog_recordings r
where r.public_id = 'rec_twinkle_twinkle_little_star'
on conflict (recording_id) do nothing;

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select r.id, 'public_domain', 'Public-domain spiritual (attributed to Wallace Willis).',
  $lyric$Swing low, sweet chariot,
Coming for to carry me home
Swing low, sweet chariot,
Coming for to carry me home$lyric$
from public.catalog_recordings r
where r.public_id = 'rec_swing_low_sweet_chariot'
on conflict (recording_id) do nothing;

insert into public.catalog_lyrics (recording_id, license, license_note, full_text)
select r.id, 'public_domain', 'Public-domain hymn (Julia Ward Howe, 1862).',
  $lyric$Mine eyes have seen the glory of the coming of the Lord;
He is trampling out the vintage where the grapes of wrath are stored;
He hath loosed the fateful lightning of His terrible swift sword:
His truth is marching on.$lyric$
from public.catalog_recordings r
where r.public_id = 'rec_battle_hymn_of_the_republic'
on conflict (recording_id) do nothing;
