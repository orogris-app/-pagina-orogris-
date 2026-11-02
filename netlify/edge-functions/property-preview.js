// OROGRIS V4.9: metadatos Open Graph de cada inmueble para WhatsApp Business.
// Un enlace de estado conserva la ficha normal; solo personalizamos el HTML inicial.
// Se consulta exclusivamente la tabla publica con la clave publica de Supabase.
const SUPABASE_URL = "https://gqqgmljmpgwvcpqtaipj.supabase.co";
const PUBLIC_KEY = "sb_publishable_KtiIFAX5yVX0EcEp_TIMxQ_esKB0Ppu";

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
}
function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
function formatPrice(price) {
  if (price == null || price === '' || !Number.isFinite(Number(price))) return '';
  return new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(Number(price)).replace(/\s/g,'');
}
function leadImage(raw) {
  let photos = raw;
  if (typeof photos === 'string') {
    try {photos=JSON.parse(photos)} catch {photos=[]}
  }
  if (!Array.isArray(photos)) return null;
  for (const entry of photos) {
    if (typeof entry !== 'string') continue;
    try {
      const u = new URL(entry);
      // Open Graph images must be publicly accessible via HTTPS.
      if (u.protocol === 'https:') return u.toString();
    } catch { /* Skip base64 and invalid photo references. */ }
  }
  return null;
}
function trimText(value, limit=90) {
  const input=clean(value);
  if (input.length<=limit) return input;
  const shortened=input.slice(0,limit+1);
  return shortened.slice(0,shortened.lastIndexOf(' ')>limit*0.60 ? shortened.lastIndexOf(' ') : limit).trimEnd()+'…';
}
function makePreview(p, url) {
  const neutral = url.searchParams.get('v') === 'neutral';
  const where=[p.city,p.neighborhood].filter(Boolean).map(clean).join(' · ');
  const detail=[
    p.area != null && p.area !== '' && Number(p.area)>0 ? `${Number(p.area).toLocaleString('es-CO')} m²` : '',
    p.rooms != null && Number(p.rooms)>0 ? `${p.rooms} hab.` : '',
    p.baths != null && Number(p.baths)>0 ? `${p.baths} baños` : ''
  ].filter(Boolean).join(' · ');
  const shortDescription=trimText(p.description,78);
  const price=formatPrice(p.price);
  const title=[trimText(p.title||'Inmueble en venta',70),price].filter(Boolean).join(' | ');
  const description=[where,detail,shortDescription].filter(Boolean).join(' — ').slice(0,220);
  const photo=leadImage(p.photos);
  return {neutral,title,description,photo};
}
function replaceHead(html, preview, url) {
  const tags=[
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(preview.title)}">`,
    `<meta property="og:description" content="${escapeHtml(preview.description)}">`,
    `<meta property="og:url" content="${escapeHtml(url.href)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(preview.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(preview.description)}">`,
    ...(preview.neutral?[]:[`<meta property="og:site_name" content="OROGRIS">`]),
    ...(preview.photo?[
      `<meta property="og:image" content="${escapeHtml(preview.photo)}">`,
      `<meta property="og:image:secure_url" content="${escapeHtml(preview.photo)}">`,
      `<meta property="og:image:alt" content="Fotografía principal del inmueble">`,
      `<meta name="twitter:image" content="${escapeHtml(preview.photo)}">`
    ]:[])
  ];
  const newHead=html
    .replace(/<title>[^<]*<\/title>/i,`<title>${escapeHtml(preview.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i,
      `<meta name="description" content="${escapeHtml(preview.description)}">`)
    // Do not leave conflicting OG tags from future static index versions.
    .replace(/<meta\s+(?:property|name)="(?:og:[^"]+|twitter:[^"]+)"[^>]*>/gi,'');
  return newHead.replace(/<\/head>/i,`${tags.join('\n')}\n</head>`);
}
export default async (request, context) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('p');
  // Don't interfere with catalog, login, web app, assets or unknown paths.
  if (url.pathname !== '/' || !id || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) {
    return context.next();
  }
  const upstream=context.next();
  try {
    const headers={apikey:PUBLIC_KEY,Accept:'application/json'};
    if (!PUBLIC_KEY.startsWith('sb_')) headers.Authorization=`Bearer ${PUBLIC_KEY}`;
    const api=new URL(`${SUPABASE_URL}/rest/v1/properties`);
    api.searchParams.set('id',`eq.${id}`);
    api.searchParams.set('status','neq.Borrador');
    api.searchParams.set('select','title,city,neighborhood,description,price,area,rooms,baths,photos');
    api.searchParams.set('limit','1');
    const result=await fetch(api,{headers});
    if (!result.ok) return await upstream;
    const props=await result.json();
    if (!Array.isArray(props) || props.length!==1) return await upstream;
    const response=await upstream;
    if (!response.ok || !(response.headers.get('content-type')||'').includes('text/html')) return response;
    const preview=makePreview(props[0],url);
    const html=replaceHead(await response.text(),preview,url);
    const outHeaders=new Headers(response.headers);
    outHeaders.delete('content-length');
    outHeaders.delete('etag');
    outHeaders.set('content-type','text/html; charset=utf-8');
    outHeaders.set('cache-control','public, max-age=0, must-revalidate');
    return new Response(html,{status:response.status,headers:outHeaders});
  } catch {
    // Never block the property page if the preview service is temporarily unavailable.
    return await upstream;
  }
};
export const config={path:'/',method:['GET']};
