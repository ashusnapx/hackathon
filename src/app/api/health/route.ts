import { getHealth, summarise } from "@/lib/health/checks";
import { noStoreJson } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Is everything this depends on actually answering?
 *
 * Public on purpose: the footer shows it, and a product that asks people to
 * trust it with a fraud report should be willing to say when a piece of it is
 * down. What it will not say is why — no hostnames, no provider errors, no
 * hint about which credential expired.
 *
 * Results are cached for half a minute, so this cannot be turned into a way of
 * making us hammer our own providers.
 */
export async function GET() {
  const report = await getHealth();
  return noStoreJson(
    {
      status: summarise(report.services),
      checkedAt: report.checkedAt,
      services: report.services,
    },
    200,
  );
}
