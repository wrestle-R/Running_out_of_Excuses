import { config } from "dotenv";
import { getServerEnv } from "@/lib/server/env";
import { iterateStravaActivityPages } from "@/lib/server/strava";
import { upsertRuns } from "@/services/runService";

config({ path: process.env.ENV_FILE || ".env.local", quiet: true });

async function main() {
  let fetched = 0;
  let total = 0;
  let succeeded = 0;
  let failed = 0;
  let inserted = 0;
  let updated = 0;
  let pages = 0;

  for await (const { page, activities } of iterateStravaActivityPages(getServerEnv(), {
    perPage: 50,
    includeDetails: false,
  })) {
    pages = page;
    fetched += activities.length;

    const result = await upsertRuns(activities);
    total += result.total;
    succeeded += result.succeeded;
    failed += result.failed;
    inserted += result.inserted;
    updated += result.updated;

    console.log(
      JSON.stringify({
        message: "Seed page completed",
        page,
        fetched: activities.length,
        ...result,
      })
    );
  }

  console.log(
    JSON.stringify(
      {
        message: "Seed completed",
        pages,
        fetched,
        total,
        succeeded,
        failed,
        inserted,
        updated,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  });
