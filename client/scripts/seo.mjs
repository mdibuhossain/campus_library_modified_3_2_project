import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { SITE, allRoutes, absolute } from "../src/seo/siteMeta.mjs";

const DIST = join(process.cwd(), "dist");
const template = readFileSync(join(DIST, "index.html"), "utf8");

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const block = (route) => {
  const url = absolute(route.path);
  const title = esc(route.title);
  const description = esc(route.description);
  const image = `${SITE.url}${SITE.image}`;
  const robots = route.noindex
    ? "noindex, follow"
    : "index, follow, max-image-preview:large, max-snippet:-1";

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.tagline,
        inLanguage: "en",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "EducationalOrganization",
        "@id": `${SITE.url}/#org`,
        name: SITE.name,
        url: SITE.url,
        logo: `${SITE.url}/assets/images/icon-512.png`,
        description:
          "A student-run library of books, question papers and syllabus for BSMRSTU.",
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: route.title,
        description: route.description,
        isPartOf: { "@id": `${SITE.url}/#website` },
        inLanguage: "en",
      },
    ],
  };

  if (route.department) {
    ld["@graph"].push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: route.department, item: url },
      ],
    });
    ld["@graph"].push({
      "@type": "CollectionPage",
      "@id": `${url}/#collection`,
      url,
      name: `${route.department} study material`,
      about: { "@type": "Thing", name: route.department },
      isPartOf: { "@id": `${SITE.url}/#website` },
    });
  }

  return `  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="${robots}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(SITE.name)}" />
  <meta property="og:locale" content="${SITE.locale}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="${SITE.imageWidth}" />
  <meta property="og:image:height" content="${SITE.imageHeight}" />
  <meta property="og:image:alt" content="${esc(SITE.name)} — ${esc(SITE.tagline)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="twitter:image:alt" content="${esc(SITE.name)} — ${esc(SITE.tagline)}" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>`;
};

const MARKER = /<!--seo-->[\s\S]*?<!--\/seo-->/;
if (!MARKER.test(template)) {
  console.error("seo: <!--seo--> marker missing from dist/index.html");
  process.exit(1);
}

const routes = allRoutes();
let written = 0;
for (const route of routes) {
  const html = template.replace(
    MARKER,
    `<!--seo-->\n${block(route)}\n  <!--/seo-->`,
  );
  const file =
    route.path === "/"
      ? join(DIST, "index.html")
      : join(DIST, route.path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  written += 1;
}

const today = new Date().toISOString().slice(0, 10);

const urls = routes
  .filter((r) => !r.noindex)
  .map(
    (r) =>
      `  <url>\n    <loc>${absolute(r.path)}</loc>\n    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
  )
  .join("\n");

writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

console.log(
  `seo: ${written} route pages, ${routes.filter((r) => !r.noindex).length} sitemap urls`,
);
