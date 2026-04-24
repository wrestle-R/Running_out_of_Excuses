import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import type { NormalizedStravaActivity } from "@/lib/server/strava";
import { upsertRuns } from "@/services/runService";

config({ path: process.env.ENV_FILE || ".env.local", quiet: true });

const DEFAULT_CSV_PATH = "public/gallery/runs-export-2026-04-24.csv";
const CSV_ID_BASE = BigInt("8000000000000000");

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function parseNumber(value: string | undefined, fallback = 0) {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePaceToMinutes(value: string | undefined) {
  const normalized = value?.trim().replace("/km", "");
  if (!normalized) return null;

  if (normalized.includes(":")) {
    const [minutes, seconds] = normalized.split(":");
    const parsedMinutes = Number.parseInt(minutes, 10);
    const parsedSeconds = Number.parseInt(seconds, 10);

    if (Number.isFinite(parsedMinutes) && Number.isFinite(parsedSeconds)) {
      return Number((parsedMinutes + parsedSeconds / 60).toFixed(2));
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDurationToSeconds(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;

  const parts = normalized.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => !Number.isFinite(part))) return null;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  return Math.round(parseNumber(normalized) * 60);
}

function toCsvActivity(row: string[], index: number): NormalizedStravaActivity | null {
  const name = row[0]?.trim();
  const date = row[1]?.trim();
  const distanceKm = parseNumber(row[2]);
  const elapsedTimeMin = parseNumber(row[3]);
  const pace = row[4]?.trim() || null;
  const description = row[5]?.trim();

  if (!name || !date || !distanceKm) {
    return null;
  }

  const splits = [];
  const splitValues = row.slice(6);

  for (let i = 0; i < splitValues.length; i += 3) {
    const splitDistance = splitValues[i]?.trim();
    const splitTime = splitValues[i + 1]?.trim();
    const splitPace = splitValues[i + 2]?.trim();

    if (!splitDistance && !splitTime && !splitPace) {
      continue;
    }

    const distanceKmValue = parseNumber(splitDistance);
    const elapsedTime = parseDurationToSeconds(splitTime);
    const paceMinPerKm = parsePaceToMinutes(splitPace);

    splits.push({
      km: splits.length + 1,
      distance: distanceKmValue > 0 ? Number((distanceKmValue * 1000).toFixed(1)) : null,
      pace_min_per_km: paceMinPerKm === null ? null : paceMinPerKm.toFixed(2),
      elapsed_time: elapsedTime,
      pace: splitPace || null,
      source_distance: splitDistance || null,
      source_time: splitTime || null,
    });
  }

  const timestamp = new Date().toISOString();
  const paceMinPerKm = parsePaceToMinutes(pace || undefined);
  const stravaId = CSV_ID_BASE + BigInt(index + 1);

  return {
    id: stravaId.toString(),
    name,
    sportType: "Run",
    date: new Date(`${date}T00:00:00.000Z`).toISOString(),
    distance_km: distanceKm,
    elapsed_time_min: elapsedTimeMin,
    average_speed_kmph:
      elapsedTimeMin > 0 ? Number((distanceKm / (elapsedTimeMin / 60)).toFixed(2)) : 0,
    pace_min_per_km: paceMinPerKm === null ? null : paceMinPerKm.toFixed(2),
    pace,
    splits,
    description: description && description !== "No description" ? description : null,
    raw: {
      id: stravaId.toString(),
      name,
      sport_type: "Run",
      start_date: new Date(`${date}T00:00:00.000Z`).toISOString(),
      distance: Number((distanceKm * 1000).toFixed(1)),
      elapsed_time: Math.round(elapsedTimeMin * 60),
      description: description || null,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function main() {
  const csvPath = resolve(process.cwd(), process.argv[2] || DEFAULT_CSV_PATH);
  const content = await readFile(csvPath, "utf8");
  const [header, ...rows] = parseCsv(content);

  if (!header?.length) {
    throw new Error(`CSV has no header: ${csvPath}`);
  }

  const activities = rows
    .map((row, index) => toCsvActivity(row, index))
    .filter((activity): activity is NormalizedStravaActivity => activity !== null);
  const result = await upsertRuns(activities);

  console.log(
    JSON.stringify(
      {
        message: "CSV seed completed",
        csvPath,
        rows: rows.length,
        parsed: activities.length,
        ...result,
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
