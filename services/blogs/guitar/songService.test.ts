import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: vi.fn() } }));
import { prisma } from "@/lib/db";
import { listGuitarSongs } from "./songService";
import list from "./song-list.json";
import catalogue from "./song-catalogue.json";
import repertoire from "./repertoire.json";

describe("owner song catalogue", () => {
  it("contains exactly 199 unique ordered entries and retains legacy quiz IDs", () => {
    expect(list.songs).toHaveLength(199);
    expect(new Set(list.songs.map(s => s.id)).size).toBe(199);
    expect(list.songs.map(s => s.position)).toEqual(Array.from({ length: 199 }, (_, i) => i + 1));
    expect(list.songs.at(-1)?.title).toBe("That’s So True");
    expect(list.songs.every(s => catalogue.some(c => c.id === s.id && c.title === s.title && c.artist === s.artist))).toBe(true);
    expect(repertoire.catalogue).toEqual(catalogue.map(s => s.id));
    expect(repertoire.versions.v3).toEqual(repertoire.versions.v2);
  });
  it("returns the database list and its real count", async () => {
    const songs = [{ position: 191, id: "mockingbird", title: "Mockingbird", artist: "Eminem", playable: false }];
    vi.mocked(prisma.$queryRaw).mockResolvedValue(songs);
    expect(await listGuitarSongs()).toEqual({ listId: "owner-selection", count: 1, songs });
  });
});
