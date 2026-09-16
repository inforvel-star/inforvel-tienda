const { normalizeText, toSlug } = require('../utils/text');

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = Array.from({ length: size }, () => 0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;

    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
      return;
    }
    if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
      return;
    }

    this.parent[rb] = ra;
    this.rank[ra] += 1;
  }
}

function comparableCost(product) {
  if (typeof product.cost === 'number' && Number.isFinite(product.cost) && product.cost > 0) {
    return product.cost;
  }
  if (typeof product.supplierPrice === 'number' && Number.isFinite(product.supplierPrice) && product.supplierPrice > 0) {
    return product.supplierPrice;
  }
  return Number.POSITIVE_INFINITY;
}

function winnerScore(product) {
  const cost = comparableCost(product);
  const imageScore = product.imageUrl ? 0 : 1;
  const stockScore = -(product.stock || 0);
  const detailScore = -(String(product.description || '').length + String(product.name || '').length);
  return [cost, imageScore, stockScore, detailScore, product.provider];
}

function compareTuple(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const av = a[i];
    const bv = b[i];
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

function chooseWinner(cluster) {
  let winner = cluster[0];
  let winnerIdx = 0;

  for (let i = 1; i < cluster.length; i += 1) {
    const candidate = cluster[i];
    if (compareTuple(winnerScore(candidate), winnerScore(winner)) < 0) {
      winner = candidate;
      winnerIdx = i;
    }
  }

  const losers = cluster.filter((_, i) => i !== winnerIdx);
  return { winner, losers };
}

function canonicalKeyOf(product) {
  const ean = normalizeText(product.ean);
  if (ean) return `ean:${ean}`;

  const pn = normalizeText(product.pn);
  if (pn) return `pn:${pn}`;

  return `sku:${toSlug(product.providerSku || `${product.provider}-${product.name}`)}`;
}

function dedupeProducts(products) {
  const uf = new UnionFind(products.length);
  const eanMap = new Map();
  const pnMap = new Map();

  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    const ean = normalizeText(p.ean);
    const pn = normalizeText(p.pn);

    if (ean) {
      if (eanMap.has(ean)) uf.union(i, eanMap.get(ean));
      else eanMap.set(ean, i);
    }

    if (pn) {
      if (pnMap.has(pn)) uf.union(i, pnMap.get(pn));
      else pnMap.set(pn, i);
    }
  }

  const groups = new Map();
  for (let i = 0; i < products.length; i += 1) {
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(products[i]);
  }

  const winners = [];
  const clusters = [];
  let duplicateClusters = 0;
  let losersCount = 0;
  let multiProviderClusters = 0;

  for (const group of groups.values()) {
    const { winner, losers } = chooseWinner(group);
    const canonicalKey = canonicalKeyOf(winner);
    const sourceProviders = Array.from(new Set(group.map((g) => g.provider)));

    winners.push({
      ...winner,
      canonicalKey,
      sourceCount: group.length,
      sourceProviders,
      sources: group,
    });

    if (group.length > 1) {
      duplicateClusters += 1;
      losersCount += losers.length;
      if (sourceProviders.length > 1) {
        multiProviderClusters += 1;
      }
      clusters.push({ canonicalKey, winner, losers, size: group.length });
    }
  }

  return {
    winners,
    clusters,
    stats: {
      inputCount: products.length,
      outputCount: winners.length,
      duplicateClusters,
      multiProviderClusters,
      losersCount,
    },
  };
}

module.exports = {
  dedupeProducts,
};
