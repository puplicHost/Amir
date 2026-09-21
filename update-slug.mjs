import fs from 'fs';

let content = fs.readFileSync('app/pages/p/[slug].vue', 'utf8');

const useHeadCode = `
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": name.value,
        "image": p.value.images.map(i => "https://mango-electronics.com" + i.path),
        "description": desc.value || "",
        "sku": p.value.slug,
        "offers": {
          "@type": "Offer",
          "url": "https://mango-electronics.com/p/" + p.value.slug,
          "priceCurrency": "EGP",
          "price": String(p.value.price),
          "availability": "https://schema.org/InStock"
        }
      })
    }
  ]
}))
`;

if (!content.includes('application/ld+json')) {
  content = content.replace('useSeoMeta(() => ({', useHeadCode + '\nuseSeoMeta(() => ({');
  fs.writeFileSync('app/pages/p/[slug].vue', content);
}
