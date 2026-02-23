import OpenAI from "openai";
import {
  EnrichmentResult,
  LeadRow,
  RowPersistence,
  enrichLeadRowWithPersistence,
} from "./enrich";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BatchResult = {
  id: LeadRow["id"];
  ok: boolean;
  result?: EnrichmentResult;
  error?: string;
};

export async function runSequentialEnrichAll(
  rows: LeadRow[],
  deps: {
    client: OpenAI;
    persistence: RowPersistence;
    intervalMs?: number;
  },
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  const intervalMs = deps.intervalMs ?? 5000;

  for (const [index, row] of rows.entries()) {
    try {
      const result = await enrichLeadRowWithPersistence(row, {
        client: deps.client,
        persistence: deps.persistence,
      });

      results.push({ id: row.id, ok: true, result });
    } catch (error) {
      results.push({
        id: row.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (index < rows.length - 1) {
      await sleep(intervalMs);
    }
  }

  return results;
}
