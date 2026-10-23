import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const list = read("../services/blogs/guitar/song-list.json");
const catalogue = read("../services/blogs/guitar/song-catalogue.json");
const repertoire = read("../services/blogs/guitar/repertoire.json");
if (list.songs.length !== 199 || new Set(list.songs.map(s => s.id)).size !== 199 || list.songs.some((s, i) => s.position !== i + 1)) throw new Error("Expected the owner's exact ordered 199-track list");
const known = new Set(catalogue.map(s => s.id));
if (known.size !== catalogue.length || list.songs.some(s => !known.has(s.id))) throw new Error("Inconsistent song catalogue");
const playable = new Set(repertoire.versions[repertoire.currentVersion]);
const songs = catalogue.map(song => ({ ...song, arrangement_id: playable.has(song.id) ? song.id : null }));
const db = new PrismaClient({ log: [] });
try {
  const count = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(214774, 2)::text`;
    await tx.$executeRaw`INSERT INTO public.blog_guitar_songs (id, title, artist, arrangement_id)
      SELECT id, title, artist, arrangement_id FROM jsonb_to_recordset(${JSON.stringify(songs)}::jsonb)
        AS s(id text, title text, artist text, arrangement_id text)
      ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, artist=EXCLUDED.artist,
        arrangement_id=EXCLUDED.arrangement_id, updated_at=now()`;
    // Replace only this ordered list; retain legacy tracks, other lists and runs.
    await tx.$executeRaw`DELETE FROM public.blog_guitar_song_list WHERE list_id=${list.listId}`;
    await tx.$executeRaw`INSERT INTO public.blog_guitar_song_list (list_id, position, song_id)
      SELECT ${list.listId}, position, id FROM jsonb_to_recordset(${JSON.stringify(list.songs)}::jsonb)
        AS s(position smallint, id text)`;
    const [row] = await tx.$queryRaw`SELECT count(*)::int AS count FROM public.blog_guitar_song_list WHERE list_id=${list.listId}`;
    if (row.count !== 199) throw new Error("The complete list was not saved");
    return row.count;
  }, { timeout: 60000, maxWait: 10000 });
  console.log(`Saved ${count} ordered tracks; existing song records and quiz runs retained.`);
} finally { await db.$disconnect(); }
