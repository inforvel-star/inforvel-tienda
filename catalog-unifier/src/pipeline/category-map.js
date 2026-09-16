const { normalizeText, safeString } = require('../utils/text');

function isGeneric(value, genericSet) {
  const normalized = normalizeText(value);
  return !normalized || genericSet.has(normalized);
}

function toTitle(value) {
  const words = safeString(value).split(' ');
  return words
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function canonicalizeLabel(value) {
  const cleaned = safeString(value);
  const key = normalizeText(cleaned);
  const aliases = {
    'cables y conectores': 'Cables y Conectores',
    'adaptadores y convertidores': 'Adaptadores y Convertidores',
    'cajas y fuentes': 'Cajas y Fuentes',
    'switches y transceptores': 'Switches y Transceptores',
    'accesorios telefonia': 'Accesorios Telefonía',
    'accesorios portatiles': 'Accesorios Portátiles',
    'discos duros internos': 'Discos Duros Internos',
    'tv': 'TV',
    'wifi': 'WiFi',
    'pc s sobremesa': 'PCs Sobremesa',
    'pcs sobremesa': 'PCs Sobremesa',
  };

  return aliases[key] || cleaned;
}

function normalizePairKey(provider, family, subfamily) {
  return [
    normalizeText(provider),
    normalizeText(family),
    normalizeText(subfamily),
  ].join('||');
}

function buildResolver(categoryMap) {
  const providerRules = categoryMap?.providerRules || {};
  const genericValues = new Set((categoryMap?.genericValues || []).map((v) => normalizeText(v)));

  const keywordRules = [];
  for (const rule of categoryMap?.keywordRules || []) {
    try {
      keywordRules.push({
        regex: new RegExp(rule.pattern, 'i'),
        family: rule.family,
        subfamily: rule.subfamily || '',
      });
    } catch {
      // Se ignoran reglas inválidas.
    }
  }

  const lastResortRules = [];
  for (const rule of categoryMap?.lastResortRules || []) {
    try {
      lastResortRules.push({
        regex: new RegExp(rule.pattern, 'i'),
        family: rule.family,
        subfamily: rule.subfamily || '',
      });
    } catch {
      // Se ignoran reglas inválidas.
    }
  }

  const brandRules = [];
  for (const rule of categoryMap?.brandRules || []) {
    try {
      brandRules.push({
        regex: new RegExp(rule.pattern, 'i'),
        family: rule.family,
        subfamily: rule.subfamily || '',
      });
    } catch {
      // Se ignoran reglas inválidas.
    }
  }

  const providerRuleMap = new Map();
  const providerRuleList = new Map();
  for (const [provider, rules] of Object.entries(providerRules)) {
    const normalizedProvider = normalizeText(provider);
    if (!providerRuleList.has(normalizedProvider)) {
      providerRuleList.set(normalizedProvider, []);
    }

    for (const rule of rules || []) {
      const key = normalizePairKey(provider, rule.rawFamily, rule.rawSubfamily);
      providerRuleMap.set(key, {
        family: rule.family,
        subfamily: rule.subfamily || '',
      });

      providerRuleList.get(normalizedProvider).push({
        rawFamily: normalizeText(rule.rawFamily || '*') || '*',
        rawSubfamily: normalizeText(rule.rawSubfamily || '*') || '*',
        family: rule.family,
        subfamily: rule.subfamily || '',
        keepRawSubfamily: Boolean(rule.keepRawSubfamily),
      });
    }
  }

  function inferByKeywords(product) {
    const haystack = normalizeText(`${product.name} ${product.description}`);
    for (const rule of keywordRules) {
      if (rule.regex.test(haystack)) {
        return {
          family: rule.family,
          subfamily: rule.subfamily || '',
          source: 'keyword-rule',
          confidence: 0.75,
        };
      }
    }
    return null;
  }

  function inferByLastResort(product) {
    const haystack = normalizeText(`${product.brand} ${product.name} ${product.description}`);
    for (const rule of lastResortRules) {
      if (rule.regex.test(haystack)) {
        return {
          family: rule.family,
          subfamily: rule.subfamily || '',
          source: 'last-resort-rule',
          confidence: 0.45,
        };
      }
    }
    return null;
  }

  function inferByBrand(product) {
    const haystack = normalizeText(`${product.brand} ${product.name} ${product.description}`);
    for (const rule of brandRules) {
      if (rule.regex.test(haystack)) {
        return {
          family: rule.family,
          subfamily: rule.subfamily || '',
          source: 'brand-rule',
          confidence: 0.85,
        };
      }
    }
    return null;
  }

  function findProviderRule(candidate) {
    const providerKey = normalizeText(candidate.provider);
    const rules = providerRuleList.get(providerKey) || [];
    if (!rules.length) return null;

    const family = normalizeText(candidate.rawFamily);
    const subfamily = normalizeText(candidate.rawSubfamily);
    let best = null;
    let bestScore = -1;

    for (const rule of rules) {
      const familyMatches = rule.rawFamily === '*' || rule.rawFamily === family;
      const subMatches = rule.rawSubfamily === '*' || rule.rawSubfamily === subfamily;
      if (!familyMatches || !subMatches) continue;

      const score = (rule.rawFamily === '*' ? 1 : 2) + (rule.rawSubfamily === '*' ? 1 : 2);
      if (score > bestScore) {
        bestScore = score;
        best = rule;
      }
    }

    return best;
  }

  function categoryCompleteness(candidate) {
    const family = normalizeText(candidate?.rawFamily || '');
    const sub = normalizeText(candidate?.rawSubfamily || '');
    const familyGood = family && !genericValues.has(family) ? 1 : 0;
    const subGood = sub && !genericValues.has(sub) ? 1 : 0;
    return familyGood + subGood;
  }

  function pickBestCategorySource(product) {
    const options = [product, ...(Array.isArray(product?.sources) ? product.sources : [])]
      .filter(Boolean)
      .map((item) => ({
        provider: item.provider || product.provider,
        rawFamily: item.rawFamily || '',
        rawSubfamily: item.rawSubfamily || '',
        brand: item.brand || product.brand || '',
        name: item.name || product.name || '',
        description: item.description || product.description || '',
      }));

    if (options.length === 0) {
      return {
        provider: product.provider,
        rawFamily: product.rawFamily || '',
        rawSubfamily: product.rawSubfamily || '',
        brand: product.brand || '',
        name: product.name || '',
        description: product.description || '',
      };
    }

    options.sort((a, b) => categoryCompleteness(b) - categoryCompleteness(a));
    return options[0];
  }

  function resolveCategory(product) {
    const candidate = pickBestCategorySource(product);
    const pairKey = normalizePairKey(candidate.provider, candidate.rawFamily, candidate.rawSubfamily);
    const providerRule = providerRuleMap.get(pairKey);
    if (providerRule) {
      return {
        family: providerRule.family,
        subfamily: providerRule.subfamily || '',
        source: 'provider-rule',
        confidence: 1,
      };
    }

    const providerWildcardRule = findProviderRule(candidate);
    if (providerWildcardRule) {
      const wildcardSubfamily = providerWildcardRule.keepRawSubfamily
        ? toTitle(candidate.rawSubfamily)
        : (providerWildcardRule.subfamily || '');

      return {
        family: providerWildcardRule.family,
        subfamily: wildcardSubfamily,
        source: 'provider-rule-wildcard',
        confidence: 0.98,
      };
    }

    const familyIsGeneric = isGeneric(candidate.rawFamily, genericValues);
    const subIsGeneric = isGeneric(candidate.rawSubfamily, genericValues);

    let family = familyIsGeneric ? '' : toTitle(candidate.rawFamily);
    let subfamily = subIsGeneric ? '' : toTitle(candidate.rawSubfamily);
    let source = '';
    let confidence = 0.5;

    if (family && subfamily) {
      source = 'raw-provider';
      confidence = 0.9;
    }

    if (!family || !subfamily) {
      const brandResult = inferByBrand(candidate);
      if (brandResult) {
        if (!family) family = brandResult.family;
        if (!subfamily) subfamily = brandResult.subfamily;
        source = source ? `${source}+brand-rule` : brandResult.source;
        confidence = Math.max(confidence, brandResult.confidence);
      }
    }

    if (!family || !subfamily) {
      const keywordResult = inferByKeywords(candidate);
      if (keywordResult) {
        if (!family) family = keywordResult.family;
        if (!subfamily) subfamily = keywordResult.subfamily;
        source = source ? `${source}+keyword-rule` : keywordResult.source;
        confidence = Math.max(confidence, keywordResult.confidence);
      }
    }

    if (!family || !subfamily) {
      const lastResortResult = inferByLastResort(candidate);
      if (lastResortResult) {
        if (!family) family = lastResortResult.family;
        if (!subfamily) subfamily = lastResortResult.subfamily;
        source = source ? `${source}+last-resort-rule` : lastResortResult.source;
        confidence = Math.max(confidence, lastResortResult.confidence);
      }
    }

    if (!family) {
      family = categoryMap?.finalFallback?.family || 'Varios';
      subfamily = subfamily || categoryMap?.finalFallback?.subfamily || 'Miscelánea tecnológica';
      source = source || 'final-fallback';
      confidence = Math.max(confidence, 0.2);
    } else if (!source) {
      source = 'raw+fallback';
      confidence = 0.6;
    }

    family = canonicalizeLabel(family);
    subfamily = canonicalizeLabel(subfamily);

    return {
      family,
      subfamily,
      source,
      confidence,
      rawFamily: candidate.rawFamily || '',
      rawSubfamily: candidate.rawSubfamily || '',
    };
  }

  return {
    resolveCategory,
  };
}

function buildCategoryAudit(products) {
  const bySource = new Map();
  const unresolvedPairs = new Map();
  const familyCounts = new Map();

  for (const product of products || []) {
    const source = product?.category?.source || 'unknown';
    bySource.set(source, (bySource.get(source) || 0) + 1);

    const family = product?.category?.family || 'Sin categorizar';
    familyCounts.set(family, (familyCounts.get(family) || 0) + 1);

    if (family === 'Sin categorizar') {
      const rawFamily = safeString(product?.rawFamily || '');
      const rawSubfamily = safeString(product?.rawSubfamily || '');
      const key = `${product.provider || ''}||${rawFamily}||${rawSubfamily}`;
      const current = unresolvedPairs.get(key) || {
        provider: product.provider || '',
        rawFamily,
        rawSubfamily,
        count: 0,
      };
      current.count += 1;
      unresolvedPairs.set(key, current);
    }
  }

  return {
    categorizedCount: (products || []).length - Array.from(unresolvedPairs.values()).reduce((acc, item) => acc + item.count, 0),
    uncategorizedCount: Array.from(unresolvedPairs.values()).reduce((acc, item) => acc + item.count, 0),
    bySource: Array.from(bySource.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    byFamily: Array.from(familyCounts.entries())
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count),
    unresolvedTop: Array.from(unresolvedPairs.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
  };
}

module.exports = {
  buildResolver,
  buildCategoryAudit,
};
