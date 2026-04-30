import Runs from "@/components/common/Runs";
import type { RunsPage } from "@/types";

export const dynamic = "force-dynamic";

const emptyRunsPage: RunsPage = {
  runs: [],
  nextCursor: null,
  totalRuns: 0,
  totalDistanceKm: 0,
};

export default async function Page() {
  return <Runs initialPage={emptyRunsPage} />;
}
