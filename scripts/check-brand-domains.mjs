// Checks the Brandfetch "brand → domain" table against the live Brand API.
//
// Usage:
//   BRANDFETCH_API_KEY=xxxxxxxx node scripts/check-brand-domains.mjs
//
// It reports, for every brand, whether the domain resolves, which logo variant
// would be picked (type/theme/format) and the brand name Brandfetch returns.
// Use it to validate the domains flagged `// verify` in src/lib/brandfetch.ts.
import { BRANDFETCH_DOMAINS, pickBrandfetchLogo } from "../src/lib/brandfetch.ts";

const apiKey = process.env.BRANDFETCH_API_KEY;
if (!apiKey) {
  console.error(
    "Missing BRANDFETCH_API_KEY.\nUsage: BRANDFETCH_API_KEY=xxxxxxxx node scripts/check-brand-domains.mjs",
  );
  process.exit(1);
}

const base =
  process.env.BRANDFETCH_API_URL ?? "https://api.brandfetch.io/v2/brands";

const rows = [];

for (const [id, domain] of Object.entries(BRANDFETCH_DOMAINS)) {
  try {
    const response = await fetch(`${base}/${encodeURIComponent(domain)}`, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      rows.push({ id, domain, status: `api_${response.status}`, logo: "-", name: "" });
      continue;
    }

    const brand = await response.json();
    const logo = pickBrandfetchLogo(brand);
    rows.push({
      id,
      domain,
      status: "ok",
      logo: logo ? `${logo.type}/${logo.theme ?? "-"}/${logo.format}` : "none",
      name: brand.name ?? "",
    });
  } catch (error) {
    rows.push({
      id,
      domain,
      status: "error",
      logo: "-",
      name: String(error).slice(0, 40),
    });
  }
}

const idWidth = Math.max(...rows.map((row) => row.id.length));
const domainWidth = Math.max(...rows.map((row) => row.domain.length));

console.log(
  `${"brand".padEnd(idWidth)}  ${"domain".padEnd(domainWidth)}  ${"status".padEnd(9)} ${"logo".padEnd(20)} name`,
);
for (const row of rows) {
  console.log(
    `${row.id.padEnd(idWidth)}  ${row.domain.padEnd(domainWidth)}  ${row.status.padEnd(9)} ${row.logo.padEnd(20)} ${row.name}`,
  );
}

const needsAttention = rows.filter(
  (row) => row.status !== "ok" || row.logo === "none",
);
console.log(
  `\n${rows.length - needsAttention.length}/${rows.length} brands resolved with a usable logo.`,
);
if (needsAttention.length > 0) {
  console.log("Needs attention:");
  for (const row of needsAttention) {
    console.log(
      ` - ${row.id} (${row.domain}): ${row.status}${row.logo === "none" ? " — no logo of a usable type" : ""}`,
    );
  }
}
