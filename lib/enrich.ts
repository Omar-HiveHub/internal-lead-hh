import OpenAI from "openai";

export type LeadRow = {
  id: string | number;
  business_name: string;
  city: string;
  state: string;
};

export type DecisionMaker = {
  name: string;
  title: string;
  source_url: string;
};

export type EnrichmentResult = {
  official_website: string | null;
  website_source_url: string | null;
  instagram_url: string | null;
  instagram_source: "website_html" | "search" | null;
  decision_makers: DecisionMaker[];
  confidence: number;
  search_queries: {
    website: string;
    instagram: string;
    decision_makers: string[];
  };
};

const ENRICHMENT_SCHEMA = {
  name: "lead_enrichment",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      official_website: { type: ["string", "null"] },
      website_source_url: { type: ["string", "null"] },
      instagram_url: { type: ["string", "null"] },
      instagram_source: {
        type: ["string", "null"],
        enum: ["website_html", "search", null],
      },
      decision_makers: {
        type: "array",
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            title: { type: "string" },
            source_url: { type: "string" },
          },
          required: ["name", "title", "source_url"],
        },
      },
    },
    required: [
      "official_website",
      "website_source_url",
      "instagram_url",
      "instagram_source",
      "decision_makers",
    ],
  },
} as const;

const RETRY_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQueries(row: LeadRow) {
  const location = `${row.business_name} ${row.city} ${row.state}`.trim();

  return {
    website: `${location} official website`,
    instagram: `${location} instagram`,
    decisionMakers: [
      `${location} owner`,
      `${location} founder`,
      `${location} president`,
      `${location} CEO`,
    ],
  };
}

function normalizeDecisionMakers(input: DecisionMaker[]): DecisionMaker[] {
  return input
    .filter(
      (p) =>
        Boolean(p?.name?.trim()) &&
        Boolean(p?.title?.trim()) &&
        Boolean(p?.source_url?.trim()),
    )
    .slice(0, 2)
    .map((p) => ({
      name: p.name.trim(),
      title: p.title.trim(),
      source_url: p.source_url.trim(),
    }));
}

function computeConfidence(result: {
  official_website: string | null;
  instagram_source: "website_html" | "search" | null;
  decision_makers: DecisionMaker[];
}): number {
  let score = 0;

  if (result.official_website) {
    score += 35;
  }

  if (result.instagram_source === "website_html") {
    score += 25;
  }

  score += normalizeDecisionMakers(result.decision_makers).length * 20;

  return Math.min(100, score);
}

function buildPrompt(row: LeadRow): string {
  const queries = buildQueries(row);

  return [
    "You are enriching CRM leads.",
    "Follow these deterministic steps exactly:",
    `1) Find the official website for: \"${queries.website}\". Prefer an official domain and avoid directory/listing sites when possible.`,
    "2) Instagram lookup:",
    "   - If website is found: open homepage HTML and extract instagram.com links first.",
    `   - If no website is found: search \"${queries.instagram}\".`,
    "3) Find decision makers by searching for owner/founder/president/CEO.",
    "4) Return up to 2 people with name, title, and source URL.",
    "Return only fields required by the schema.",
  ].join("\n");
}

export async function enrichLeadRow(
  row: LeadRow,
  client: OpenAI,
): Promise<EnrichmentResult> {
  const queries = buildQueries(row);

  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: "gpt-4.1",
        tools: [{ type: "web_search" }],
        input: buildPrompt(row),
        text: {
          format: {
            type: "json_schema",
            ...ENRICHMENT_SCHEMA,
          },
        },
      });

      const parsed = response.output_parsed as {
        official_website: string | null;
        website_source_url: string | null;
        instagram_url: string | null;
        instagram_source: "website_html" | "search" | null;
        decision_makers: DecisionMaker[];
      } | null;

      if (!parsed) {
        throw new Error("Responses API returned no parsed JSON payload");
      }

      const decision_makers = normalizeDecisionMakers(parsed.decision_makers ?? []);

      const normalized: EnrichmentResult = {
        official_website: parsed.official_website?.trim() || null,
        website_source_url: parsed.website_source_url?.trim() || null,
        instagram_url: parsed.instagram_url?.trim() || null,
        instagram_source: parsed.instagram_source,
        decision_makers,
        confidence: computeConfidence({
          official_website: parsed.official_website,
          instagram_source: parsed.instagram_source,
          decision_makers,
        }),
        search_queries: {
          website: queries.website,
          instagram: queries.instagram,
          decision_makers: queries.decisionMakers,
        },
      };

      return normalized;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_ATTEMPTS) {
        await sleep(250 * attempt);
      }
    }
  }

  throw new Error(
    `Enrichment failed after ${RETRY_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

type EnrichStatus = "pending" | "running" | "done" | "error";

export type RowPersistence = {
  setStatus: (args: {
    id: LeadRow["id"];
    enrich_status: EnrichStatus;
    enrich_error: string | null;
    last_enriched_at?: Date | null;
  }) => Promise<void>;
};

export async function enrichLeadRowWithPersistence(
  row: LeadRow,
  deps: {
    client: OpenAI;
    persistence: RowPersistence;
  },
): Promise<EnrichmentResult> {
  await deps.persistence.setStatus({
    id: row.id,
    enrich_status: "running",
    enrich_error: null,
    last_enriched_at: null,
  });

  try {
    const result = await enrichLeadRow(row, deps.client);

    await deps.persistence.setStatus({
      id: row.id,
      enrich_status: "done",
      enrich_error: null,
      last_enriched_at: new Date(),
    });

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown enrichment error";

    await deps.persistence.setStatus({
      id: row.id,
      enrich_status: "error",
      enrich_error: message,
      last_enriched_at: new Date(),
    });

    throw error;
  }
}
