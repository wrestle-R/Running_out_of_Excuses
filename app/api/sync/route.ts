import { getServerEnv } from "@/lib/server/env";
import { jsonResponse, optionsResponse, textResponse } from "@/lib/server/http";
import { getLatestStravaActivities, iterateStravaActivityPages } from "@/lib/server/strava";
import {
  countRuns,
  rebuildTimelineDataForActivities,
  rebuildTimelineDataFromRuns,
  removeLegacyCsvDuplicates,
  upsertRuns,
} from "@/services/runService";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST() {
  try {
    const env = getServerEnv();
    const existingRuns = await countRuns();
    const expectedSeedCount = Number(process.env.STRAVA_EXPECTED_ACTIVITY_COUNT || 101);

    if (existingRuns < expectedSeedCount) {
      let fetched = 0;
      let total = 0;
      let succeeded = 0;
      let failed = 0;
      let inserted = 0;
      let updated = 0;
      let pages = 0;

      for await (const { page, activities } of iterateStravaActivityPages(env, {
        perPage: 50,
        includeDetails: false,
      })) {
        pages = page;
        fetched += activities.length;
        const pageResult = await upsertRuns(activities);

        total += pageResult.total;
        succeeded += pageResult.succeeded;
        failed += pageResult.failed;
        inserted += pageResult.inserted;
        updated += pageResult.updated;
      }
      const cleanup = await removeLegacyCsvDuplicates();
      const timeline = await rebuildTimelineDataFromRuns();

      return jsonResponse({
        message: "Initial seed completed",
        mode: "seed",
        pages,
        existingBeforeSync: existingRuns,
        expectedSeedCount,
        fetched,
        total,
        totalCount: total,
        succeeded,
        failed,
        inserted,
        updated,
        removedDuplicateCsvRuns: cleanup.removed,
        timelineMonthsRebuilt: timeline.monthsRebuilt,
        timelineYearsRebuilt: timeline.yearsRebuilt,
        newCount: inserted,
      });
    }

    const activities = await getLatestStravaActivities(env, 25);
    const result = await upsertRuns(activities);
    const cleanup = await removeLegacyCsvDuplicates();
    const timeline = await rebuildTimelineDataForActivities(activities);

    return jsonResponse({
      message: "Sync completed",
      mode: "refresh",
      fetched: activities.length,
      totalCount: result.total,
      newCount: result.inserted,
      removedDuplicateCsvRuns: cleanup.removed,
      timelineMonthsRebuilt: timeline.monthsRebuilt,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Unable to sync runs:", error);
    return jsonResponse(
      { error: "Unable to sync runs" },
      { status: message.includes("rate limit exceeded") ? 429 : 500 }
    );
  }
}

export function GET() {
  return textResponse("Not found", { status: 404 });
}
