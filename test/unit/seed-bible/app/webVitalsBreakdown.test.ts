import { describe, expect, it } from "vitest";
import type {
  FCPMetricWithAttribution,
  LCPMetricWithAttribution,
} from "web-vitals/attribution";
import {
  fcpBreakdown,
  lcpBreakdown,
} from "../../../../packages/seed-bible/seed-bible/app/webVitalsBreakdown";

/** A fresh-connection network load, with every phase recorded. */
function makeNavigationEntry(
  overrides: Partial<PerformanceNavigationTiming> = {}
): PerformanceNavigationTiming {
  return {
    workerStart: 0,
    fetchStart: 10,
    redirectStart: 0,
    redirectEnd: 0,
    domainLookupStart: 12,
    domainLookupEnd: 40,
    connectStart: 40,
    secureConnectionStart: 70,
    connectEnd: 120,
    requestStart: 121,
    responseStart: 421,
    responseEnd: 600,
    transferSize: 48_000,
    encodedBodySize: 47_500,
    serverTiming: [
      { name: "total", duration: 210.4, description: "" },
      { name: "render", duration: 180.6, description: "" },
    ],
    ...overrides,
  } as unknown as PerformanceNavigationTiming;
}

function makeLcp(
  navigationEntry: PerformanceNavigationTiming | undefined
): LCPMetricWithAttribution {
  return {
    name: "LCP",
    value: 2549.6,
    rating: "needs-improvement",
    navigationType: "navigate",
    attribution: {
      target: "#app > div.sb-chapter-content > p",
      timeToFirstByte: 421.2,
      resourceLoadDelay: 0,
      resourceLoadDuration: 0,
      elementRenderDelay: 2128.4,
      navigationEntry,
    },
  } as unknown as LCPMetricWithAttribution;
}

describe("lcpBreakdown", () => {
  it("splits LCP into its phases and the HTML request into network and server time", () => {
    const props = lcpBreakdown(makeLcp(makeNavigationEntry()), {
      connection: { effectiveType: "4g", rtt: 150, downlink: 3.2 },
      pageLoadOutcome: "hydrated",
    });

    expect(props).toMatchObject({
      value_ms: 2550,
      time_to_first_byte_ms: 421,
      resource_load_delay_ms: 0,
      resource_load_duration_ms: 0,
      element_render_delay_ms: 2128,
      element: "#app > div.sb-chapter-content > p",
      served_via_service_worker: false,
      service_worker_startup_ms: null,
      redirect_ms: null,
      dns_ms: 28,
      connect_ms: 80,
      tls_ms: 50,
      request_to_first_byte_ms: 300,
      html_download_ms: 179,
      html_transfer_bytes: 48_000,
      server_total_ms: 210,
      server_render_ms: 181,
      effective_connection_type: "4g",
      connection_rtt_ms: 150,
      page_load_outcome: "hydrated",
    });
  });

  it("drops the server timings from a service-worker-served page, whose header is from an earlier render", () => {
    const props = lcpBreakdown(
      makeLcp(
        makeNavigationEntry({
          workerStart: 5,
          fetchStart: 45,
          transferSize: 0,
        })
      ),
      {}
    );

    expect(props).toMatchObject({
      served_via_service_worker: true,
      service_worker_startup_ms: 40,
      html_transfer_bytes: 0,
      server_total_ms: null,
      server_render_ms: null,
    });
  });

  it("reports the outcome as pending when LCP is finalized before the client finishes booting", () => {
    const props = lcpBreakdown(makeLcp(makeNavigationEntry()), {});

    expect(props.page_load_outcome).toBe("pending");
    expect(props.effective_connection_type).toBeNull();
  });

  it("still reports the LCP phases when the browser has no navigation entry", () => {
    const props = lcpBreakdown(makeLcp(undefined), {});

    expect(props).toMatchObject({ value_ms: 2550, time_to_first_byte_ms: 421 });
    expect(props).not.toHaveProperty("dns_ms");
  });

  it("reports a missing Server-Timing header as unknown, not zero", () => {
    const props = lcpBreakdown(
      makeLcp(makeNavigationEntry({ serverTiming: [] })),
      {}
    );

    expect(props.server_total_ms).toBeNull();
    expect(props.server_render_ms).toBeNull();
  });
});

describe("fcpBreakdown", () => {
  it("splits FCP into time to first byte and the time after it", () => {
    const metric = {
      name: "FCP",
      value: 2801,
      rating: "needs-improvement",
      navigationType: "navigate",
      attribution: {
        timeToFirstByte: 421.2,
        firstByteToFCP: 2379.8,
        loadState: "dom-content-loaded",
        navigationEntry: makeNavigationEntry(),
      },
    } as unknown as FCPMetricWithAttribution;

    const props = fcpBreakdown(metric, { connection: { effectiveType: "3g" } });

    expect(props).toMatchObject({
      value_ms: 2801,
      time_to_first_byte_ms: 421,
      first_byte_to_fcp_ms: 2380,
      load_state: "dom-content-loaded",
      request_to_first_byte_ms: 300,
      server_render_ms: 181,
      effective_connection_type: "3g",
    });
    expect(props).not.toHaveProperty("page_load_outcome");
  });
});
