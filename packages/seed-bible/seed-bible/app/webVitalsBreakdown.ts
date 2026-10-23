import {
  onFCP,
  onLCP,
  type FCPMetricWithAttribution,
  type LCPMetricWithAttribution,
} from "web-vitals/attribution";
import type { HydrationDeclineReason } from "./hydrationGate";

/**
 * Splits each page load's LCP and FCP into network, server and browser time
 * and reports it to PostHog, so the dashboard's single LCP/FCP number can be
 * broken down into where the time actually went.
 *
 * Server time comes from the `Server-Timing` header the host server sends
 * with every HTML response (see `serverTimingHeader` in `server/index.ts`).
 */

/** How the client brought the server-rendered page to life (see `init.tsx`). */
export type PageLoadOutcome =
  | "hydrated"
  | "hydration-fell-back"
  | "hydration-failed"
  | `rendered:${HydrationDeclineReason}`;

let pageLoadOutcome: PageLoadOutcome | undefined;

export function recordPageLoadOutcome(outcome: PageLoadOutcome): void {
  pageLoadOutcome = outcome;
}

/** The parts of `navigator.connection` this reads; Chromium-only. */
interface NetworkInformationLike {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
}

export interface LoadContext {
  connection?: NetworkInformationLike;
  pageLoadOutcome?: PageLoadOutcome;
}

type Properties = Record<string, string | number | boolean | null>;

const round = (ms: number): number => Math.round(ms);

/** A phase's duration, or null when the browser didn't record its endpoints. */
function span(start: number, end: number): number | null {
  return start > 0 && end >= start ? round(end - start) : null;
}

/**
 * Breaks the HTML document request into its network phases. Every value is
 * in milliseconds; a phase that didn't happen (no redirect, a reused
 * connection) comes out as 0 or null.
 */
export function navigationPhases(nav: PerformanceNavigationTiming): Properties {
  // `workerStart` is 0 unless a service worker handled this navigation.
  const servedViaServiceWorker = nav.workerStart > 0;
  const serverTimings = Object.fromEntries(
    (nav.serverTiming ?? []).map((t) => [t.name, t.duration])
  );
  return {
    served_via_service_worker: servedViaServiceWorker,
    service_worker_startup_ms: servedViaServiceWorker
      ? span(nav.workerStart, nav.fetchStart)
      : null,
    redirect_ms: span(nav.redirectStart, nav.redirectEnd),
    dns_ms: span(nav.domainLookupStart, nav.domainLookupEnd),
    connect_ms: span(nav.connectStart, nav.connectEnd),
    tls_ms: span(nav.secureConnectionStart, nav.connectEnd),
    request_to_first_byte_ms: span(nav.requestStart, nav.responseStart),
    html_download_ms: span(nav.responseStart, nav.responseEnd),
    // 0 when the HTML came from a cache rather than the network.
    html_transfer_bytes: nav.transferSize,
    html_encoded_bytes: nav.encodedBodySize,
    // A cached copy (the service worker's) still carries the Server-Timing
    // header from whenever it was originally rendered, which says nothing
    // about this load, so it's only reported for network responses.
    server_render_ms:
      !servedViaServiceWorker && typeof serverTimings.render === "number"
        ? round(serverTimings.render)
        : null,
    server_total_ms:
      !servedViaServiceWorker && typeof serverTimings.total === "number"
        ? round(serverTimings.total)
        : null,
  };
}

function connectionProperties(context: LoadContext): Properties {
  return {
    effective_connection_type: context.connection?.effectiveType ?? null,
    connection_rtt_ms: context.connection?.rtt ?? null,
    connection_downlink_mbps: context.connection?.downlink ?? null,
    save_data: context.connection?.saveData ?? null,
  };
}

export function lcpBreakdown(
  metric: LCPMetricWithAttribution,
  context: LoadContext
): Properties {
  const a = metric.attribution;
  return {
    value_ms: round(metric.value),
    rating: metric.rating,
    navigation_type: metric.navigationType,
    // The four LCP phases; together they add up to `value_ms`.
    time_to_first_byte_ms: round(a.timeToFirstByte),
    resource_load_delay_ms: round(a.resourceLoadDelay),
    resource_load_duration_ms: round(a.resourceLoadDuration),
    element_render_delay_ms: round(a.elementRenderDelay),
    element: a.target ?? null,
    resource_url: a.url ?? null,
    ...(a.navigationEntry ? navigationPhases(a.navigationEntry) : {}),
    ...connectionProperties(context),
    // LCP is finalized on the first input or when the page is hidden, which
    // can land before the client finishes booting -- "pending" says so.
    page_load_outcome: context.pageLoadOutcome ?? "pending",
  };
}

// FCP always lands before the client boots, so it has no page load outcome.
export function fcpBreakdown(
  metric: FCPMetricWithAttribution,
  context: LoadContext
): Properties {
  const a = metric.attribution;
  return {
    value_ms: round(metric.value),
    rating: metric.rating,
    navigation_type: metric.navigationType,
    // Together these add up to `value_ms`.
    time_to_first_byte_ms: round(a.timeToFirstByte),
    first_byte_to_fcp_ms: round(a.firstByteToFCP),
    load_state: a.loadState,
    ...(a.navigationEntry ? navigationPhases(a.navigationEntry) : {}),
    ...connectionProperties(context),
  };
}

function currentContext(): LoadContext {
  return {
    connection: (
      navigator as Navigator & { connection?: NetworkInformationLike }
    ).connection,
    pageLoadOutcome,
  };
}

export function startWebVitalsBreakdownReporting(): void {
  onLCP((metric) => {
    posthog.capture(
      "web_vitals_lcp_breakdown",
      lcpBreakdown(metric, currentContext())
    );
  });
  onFCP((metric) => {
    posthog.capture(
      "web_vitals_fcp_breakdown",
      fcpBreakdown(metric, currentContext())
    );
  });
}
