import Runs from "@/components/common/Runs";
import { listRunsPage } from "@/services/runService";
import type { RunsPage } from "@/types";

export const dynamic = "force-dynamic";

const emptyRunsPage: RunsPage = {
  runs: [],
  nextCursor: null,
  totalRuns: 0,
  totalDistanceKm: 0,
};

export default async function Page() {
  try {
    const initialPage = await listRunsPage({ limit: 24 });

    return <Runs initialPage={initialPage} />;
  } catch (error) {
    console.error("Unable to load initial runs page:", error);

    return (
      <Runs
        initialPage={emptyRunsPage}
        initialError="Unable to reach the runs database. Please retry in a moment."
      />
    );
  }
}
