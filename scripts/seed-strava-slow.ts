import { config } from "dotenv";
import { getServerEnv } from "@/lib/server/env";
import { getStravaActivitiesPage } from "@/lib/server/strava";
import { countRuns, upsertRuns } from "@/services/runService";

config({ path: process.env.ENV_FILE || ".env.local", quiet: true });

const args = new Set(process.argv.slice(2));

function readNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("rate limit");
}

function printHelp() {
  console.log(`Slow Strava seed

Usage:
  npm run sed
  npm run seed:slow

Options:
  --once      Fetch and upsert one batch, then exit.
  --help      Show this message.

Environment overrides:
  SLOW_SEED_BATCH_SIZE=20
  SLOW_SEED_WAIT_MINUTES=20
  SLOW_SEED_START_PAGE=1
  SLOW_SEED_EXPECTED_COUNT=101
`);
}

async function main() {
  if (args.has("--help")) {
    printHelp();
    return;
  }

  const batchSize = readNumber("SLOW_SEED_BATCH_SIZE", 20);
  const waitMinutes = readNumber("SLOW_SEED_WAIT_MINUTES", 20);
  const expectedCount = readNumber(
    "SLOW_SEED_EXPECTED_COUNT",
    Number(process.env.STRAVA_EXPECTED_ACTIVITY_COUNT || 101)
  );
  const waitMs = waitMinutes * 60 * 1000;
  const once = args.has("--once");
  let page = readNumber("SLOW_SEED_START_PAGE", 1);

  console.log(
    JSON.stringify({
      message: "Slow seed started",
      batchSize,
      waitMinutes,
      expectedCount,
      startPage: page,
    })
  );

  while (true) {
    const currentCount = await countRuns();
    if (currentCount >= expectedCount) {
      console.log(
        JSON.stringify({
          message: "Slow seed completed",
          currentCount,
          expectedCount,
        })
      );
      return;
    }

    try {
      const activities = await getStravaActivitiesPage(getServerEnv(), {
        page,
        perPage: batchSize,
        includeDetails: false,
      });
      const result = await upsertRuns(activities);
      const nextCount = await countRuns();

      console.log(
        JSON.stringify({
          message: "Slow seed batch completed",
          page,
          fetched: activities.length,
          dbCount: nextCount,
          ...result,
        })
      );

      if (activities.length < batchSize) {
        console.log(
          JSON.stringify({
            message: "Reached final Strava page",
            page,
            dbCount: nextCount,
          })
        );
        return;
      }

      if (once) {
        console.log(JSON.stringify({ message: "Stopping after one batch", nextPage: page + 1 }));
        return;
      }

      page += 1;
    } catch (error) {
      console.error(error);

      if (!isRateLimitError(error)) {
        process.exitCode = 1;
        return;
      }

      console.log(
        JSON.stringify({
          message: "Rate limited; waiting before retrying same page",
          page,
          waitMinutes,
        })
      );
    }

    await sleep(waitMs);
  }
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
