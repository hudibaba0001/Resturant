/*
  Verify 204 No Content on deleting an empty section via deployed proxy
  - Finds section named 'Drinks'
  - Deletes all items in that section
  - Deletes the section and prints status/body
*/

(async function main() {
  const BASE = 'https://resturant-two-xi.vercel.app';
  const RESTAURANT_ID = '64806e5b-714f-4388-a092-29feff9b64c0';
  const MENU = 'main';
  const SECTION_NAME = 'Drinks';

  async function getJson(url, init) {
    const res = await fetch(url, init);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { res, text, json };
  }

  try {
    // 1) Find section id
    const secUrl = BASE + '/dashboard/proxy/menus/sections?restaurant_id=' + encodeURIComponent(RESTAURANT_ID) + '&menu=' + encodeURIComponent(MENU);
    const sec = await getJson(secUrl);
    const list = (sec.json && (sec.json.sections || sec.json.data)) || [];
    const section = list.find(x => x && x.name === SECTION_NAME);
    if (!section) {
      console.log('NO_SECTION');
      process.exit(2);
    }

    // 2) List items in section
    const itemsUrl = BASE + '/dashboard/proxy/items?restaurantId=' + encodeURIComponent(RESTAURANT_ID) + '&menu=' + encodeURIComponent(MENU) + '&section=' + encodeURIComponent(SECTION_NAME) + '&limit=200';
    const itemsResp = await getJson(itemsUrl);
    const items = Array.isArray(itemsResp.json?.data) ? itemsResp.json.data : (Array.isArray(itemsResp.json) ? itemsResp.json : []);
    console.log('FOUND_ITEMS', items.length);

    // 3) Delete items
    let ok = 0, fail = 0;
    for (const it of items) {
      if (!it || !it.id) continue;
      const d = await fetch(BASE + '/dashboard/proxy/items/' + it.id, { method: 'DELETE' });
      if (d.status === 204 || d.status === 200) ok++; else fail++;
    }
    console.log('ITEMS_DELETED_OK', ok, 'FAILED', fail);

    // 4) Delete section
    const delSec = await fetch(BASE + '/dashboard/proxy/menus/sections/' + section.id, { method: 'DELETE' });
    const body = await delSec.text();
    console.log('SECTION_DELETE_STATUS', delSec.status);
    console.log('SECTION_DELETE_BODY', body || '<empty>');

    // Expect 204
    process.exit(delSec.status === 204 ? 0 : 3);
  } catch (e) {
    console.error('ERR', e && e.message || e);
    process.exit(1);
  }
})();


