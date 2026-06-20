import { extractExplicitRefs } from "ext_AI_Transcript.main.explicit";

/** A segment as seen by the matcher (timestamps + text). */
export interface InferSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface InferredRef {
  ref: string;
  type: "verse";
  explicit: false;
  confidence: number;
  start: number;
  end: number;
  quotedText: string;
  /** Segments the quote overlaps (refs get attached to each). */
  segmentIds: number[];
}

/** A reference entry the model writes into a segment's `references` array. */
type AiRefEntry = string | { reference?: string; confidence?: number };

/** A segment as returned by the model (ids echoed, references filled). */
interface AiSegment {
  id: number;
  references?: AiRefEntry[];
}

const SYSTEM_PROMPT = [
  "You are given a JSON array of transcript segments. Each segment has an `id`, a `text`, and an empty `references` array.",
  "For each segment, fill its `references` array with every Bible reference that the segment's text quotes, paraphrases, or clearly alludes to — even when no reference is spoken aloud.",
  'Each reference is an object: {"reference": string, "confidence": number}',
  '- "reference": a human-readable reference using a common English book name, e.g. "John 3:16" or "Genesis 1:1-3".',
  '- "confidence": your confidence from 0 to 1 that this is a genuine Scripture reference.',
  "Keep every segment `id` exactly as given.",
  "Respond with ONLY a JSON array containing the segments that have at least one reference (omit segments with none) — no prose and no markdown code fences.",
  "If no segment has any reference, respond with exactly [].",
].join("\n");

// --- AI call ----------------------------------------------------------------

async function askAi(
  inputSegments: { id: number; text: string; references: [] }[]
): Promise<AiSegment[]> {
  const res = await ai.chat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(inputSegments) },
  ]);
  const content = res.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map((p) => ("text" in p ? p.text : "")).join(" ")
        : "";
  return parseAiSegments(text);
}

function parseAiSegments(text: string): AiSegment[] {
  if (!text) return [];
  // Tolerate markdown fences / surrounding prose by slicing out the JSON array.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  const json = start >= 0 && end > start ? text.slice(start, end + 1) : text;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as AiSegment[]) : [];
  } catch {
    return [];
  }
}

// --- Public API -------------------------------------------------------------

/**
 * Infer references for quoted/paraphrased scripture using the AI, filtered by
 * minConfidence. Returns one entry per detected verse (ranges expand to one id
 * each); timestamps come from the segment the model attached the reference to.
 */
export async function inferRefs(
  segments: InferSegment[],
  minConfidence: number
): Promise<InferredRef[]> {
  if (!segments.length) return [];

  // Hand the model the structured segments with empty reference slots to fill.
  const input = segments.map((s) => ({
    id: s.id,
    text: s.text,
    references: [] as [],
  }));
  const aiSegs = await askAi(input);
  if (!aiSegs.length) return [];

  const segById = new Map(segments.map((s) => [s.id, s]));
  const threshold = Math.max(minConfidence ?? 0, 0);

  // De-dup by ref id, merging segment ownership and widening the time span.
  const byRef = new Map<string, InferredRef>();
  for (const aiSeg of aiSegs) {
    const seg = segById.get(aiSeg.id);
    if (!seg || !Array.isArray(aiSeg.references)) continue;

    for (const entry of aiSeg.references) {
      const referenceStr = typeof entry === "string" ? entry : entry?.reference;
      const confidence =
        typeof entry === "object" && typeof entry?.confidence === "number"
          ? entry.confidence
          : 0.9;
      if (!referenceStr || confidence < threshold) continue;

      // Canonicalize the model's free-text reference into our OSIS ref id(s).
      const matches = extractExplicitRefs(referenceStr);
      for (const m of matches) {
        const existing = byRef.get(m.ref);
        if (existing) {
          if (!existing.segmentIds.includes(seg.id)) {
            existing.segmentIds.push(seg.id);
          }
          existing.start = Math.min(existing.start, seg.start);
          existing.end = Math.max(existing.end, seg.end);
          if (confidence > existing.confidence) {
            existing.confidence = Number(confidence.toFixed(3));
          }
        } else {
          byRef.set(m.ref, {
            ref: m.ref,
            type: "verse",
            explicit: false,
            confidence: Number(confidence.toFixed(3)),
            start: seg.start,
            end: seg.end,
            quotedText: seg.text,
            segmentIds: [seg.id],
          });
        }
      }
    }
  }

  return [...byRef.values()].sort(
    (a, b) => a.start - b.start || b.confidence - a.confidence
  );
}
