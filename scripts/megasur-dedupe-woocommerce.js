const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

const api = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WC_URL,
  consumerKey: process.env.WC_CONSUMER_KEY || process.env.WC_SERVER_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET || process.env.WC_SERVER_CONSUMER_SECRET,
  version: 'wc/v3',
});

async function run() {
  const perPage = 100;
  const bySku = new Map();
  let totalWithSku = 0;

  const first = await api.get('products', { status: 'any', per_page: perPage, page: 1 });
  const totalPages = Number(first.headers['x-wp-totalpages'] || 1);

  const consume = (products) => {
    for (const product of products) {
      const sku = String(product.sku || '').trim();
      if (!sku) continue;
      if (!bySku.has(sku)) bySku.set(sku, []);
      bySku.get(sku).push({ id: product.id, status: product.status, regular_price: product.regular_price });
      totalWithSku++;
    }
  };

  consume(first.data || []);
  console.log(`[scan] pagina 1/${totalPages}`);

  for (let page = 2; page <= totalPages; page++) {
    const { data } = await api.get('products', { status: 'any', per_page: perPage, page });
    consume(data || []);
    if (page % 20 === 0 || page === totalPages) {
      console.log(`[scan] pagina ${page}/${totalPages}`);
    }
  }

  const duplicatedSkus = Array.from(bySku.entries()).filter(([, items]) => items.length > 1);
  console.log(`[scan] sku duplicados detectados: ${duplicatedSkus.length}`);

  let trashed = 0;
  for (let i = 0; i < duplicatedSkus.length; i++) {
    const [sku, items] = duplicatedSkus[i];
    items.sort((a, b) => a.id - b.id);
    const duplicates = items.slice(1);

    for (const duplicate of duplicates) {
      try {
        await api.delete(`products/${duplicate.id}`, { force: false });
        trashed++;
      } catch (error) {
        const msg = error?.response?.data?.message || error.message;
        console.error(`[delete] error sku ${sku} id ${duplicate.id}: ${msg}`);
      }
    }

    if ((i + 1) % 20 === 0 || i + 1 === duplicatedSkus.length) {
      console.log(`[delete] ${i + 1}/${duplicatedSkus.length} sku procesados, enviados a papelera: ${trashed}`);
    }
  }

  console.log(`[done] total con sku: ${totalWithSku}`);
  console.log(`[done] sku duplicados: ${duplicatedSkus.length}`);
  console.log(`[done] enviados a papelera: ${trashed}`);
}

run().catch((error) => {
  console.error('[fatal]', error?.response?.data || error.message || error);
  process.exit(1);
});
