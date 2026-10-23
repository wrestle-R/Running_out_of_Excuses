import { prisma } from "@/lib/db";

export const OWNER_SONG_LIST = "owner-selection";
export type ListedSong = { position: number; id: string; title: string; artist: string; playable: boolean };
export async function listGuitarSongs() {
  const songs = await prisma.$queryRaw<ListedSong[]>`
    SELECT l.position, s.id, s.title, s.artist, (s.arrangement_id IS NOT NULL) AS playable
    FROM public.blog_guitar_song_list l
    JOIN public.blog_guitar_songs s ON s.id = l.song_id
    WHERE l.list_id = ${OWNER_SONG_LIST} ORDER BY l.position`;
  return { listId: OWNER_SONG_LIST, count: songs.length, songs };
}
