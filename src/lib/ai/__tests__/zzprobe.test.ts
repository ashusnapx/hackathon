import { writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { extractAmount, extractEntities, extractIncidentTime } from "@/lib/ai/extract";
describe("probe", () => {
  it("runs", () => {
    const out: string[] = [];
    const now = new Date("2026-09-08T14:37:00+05:30");
    const cases = ["₹८५०००","९८७६५४३२१०","eighty five thousand","they took 85000 rupees","₹85,000 then later 2 lakh worth","they took 85,000 from me my account is 12,345,678","98450 12345","hdfc12345678901","HDFC12345678901","Yesterday evening I got a call on WhatsApp and they took ₹85,000, number 9876543210 and UTR 402512345678"];
    for (const c of cases) out.push(`${JSON.stringify(c)} amt=${extractAmount(c)} ent=${JSON.stringify(extractEntities(c))}`);
    for (const p of ["yesterday evening","kal raat","2 hours ago","3 days ago","just now","aaj shaam","परसों शाम"]) out.push(`${p} -> ${extractIncidentTime(p, now)}`);
    writeFileSync("/tmp/probe-out.txt", out.join("\n"));
  });
});
