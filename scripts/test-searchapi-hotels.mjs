const key = process.env.SEARCHAPI_KEY || process.env.GOOGLE_HOTELS_API_KEY;
if (!key) {
  console.error('Missing SEARCHAPI_KEY. Example: set SEARCHAPI_KEY=your_key && node scripts/test-searchapi-hotels.mjs');
  process.exit(1);
}
const url = new URL('https://www.searchapi.io/api/v1/search');
url.searchParams.set('engine', 'google_hotels');
url.searchParams.set('q', process.argv[2] || 'Hotels in Istanbul');
url.searchParams.set('check_in_date', process.argv[3] || '2026-06-05');
url.searchParams.set('check_out_date', process.argv[4] || '2026-06-12');
url.searchParams.set('currency', process.argv[5] || 'USD');
url.searchParams.set('api_key', key);
const res = await fetch(url);
const data = await res.json().catch(async () => ({ raw: await res.text() }));
console.log('STATUS', res.status);
console.log('COUNT', Array.isArray(data.properties) ? data.properties.length : 0);
console.log(JSON.stringify((data.properties || []).slice(0, 3).map(h => ({
  name: h.name,
  price: h.total_price?.price || h.price_per_night?.price,
  rating: h.rating,
  reviews: h.reviews,
  image: h.images?.[0]?.thumbnail,
  link: h.link
})), null, 2));
if (data.error || data.message) console.log('API_ERROR', data.error || data.message);
