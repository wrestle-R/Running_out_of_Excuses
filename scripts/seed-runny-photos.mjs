import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const seed = JSON.parse(readFileSync(new URL("../lib/runny-photo-seed.json", import.meta.url), "utf8"));
  const data = seed.map(({ seedKey, ...photo }) => {
    let hex = createHash("sha256").update("runny-photo:" + seedKey).digest("hex").slice(0, 32);
    hex = hex.slice(0, 12) + "4" + hex.slice(13, 16) + "8" + hex.slice(17);
    const id = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
    return { id, ...photo };
  });
  const result = await prisma.runnyPhoto.createMany({ data, skipDuplicates: true });
  console.log(`Added ${result.count} original photo placements. Existing edits and removals retained.`);
} finally { await prisma.$disconnect(); }
