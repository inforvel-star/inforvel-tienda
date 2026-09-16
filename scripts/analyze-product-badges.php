<?php
/**
 * Read-only WooCommerce product badge analyzer.
 *
 * Run with:
 *   wp eval-file /var/www/frontend-dev/scripts/analyze-product-badges.php --path=/var/www/wp --allow-root
 */

if (!defined('ABSPATH')) {
    fwrite(STDERR, "Run this script through WP-CLI.\n");
    exit(1);
}

global $wpdb;

const INFORVEL_BADGE_REPORT_DIR = '/var/www/frontend-dev/logs/product-badges';
const INFORVEL_BADGE_META_KEY = '_inforvel_product_badges';

function normalize_catalog_text(string $value): string
{
    $value = remove_accents(mb_strtolower(wp_strip_all_tags($value)));
    $value = preg_replace('/[^a-z0-9]+/u', ' ', $value);
    return trim(preg_replace('/\s+/', ' ', $value));
}

function has_any(string $text, array $patterns): bool
{
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $text)) {
            return true;
        }
    }
    return false;
}

function extract_capacity_gb(string $text): ?float
{
    if (!preg_match_all('/\b(\d+(?:[.,]\d+)?)\s*(tb|gb)\b/i', $text, $matches, PREG_SET_ORDER)) {
        return null;
    }

    $capacities = [];
    foreach ($matches as $match) {
        $value = (float) str_replace(',', '.', $match[1]);
        $capacities[] = strtolower($match[2]) === 'tb' ? $value * 1024 : $value;
    }

    return $capacities ? max($capacities) : null;
}

function extract_ram_gb(string $text): ?float
{
    $patterns = [
        '/\b(?:ram|memoria)\s*[:\-]?\s*(\d+)\s*gb\b/i',
        '/\b(\d+)\s*gb\s+(?:ram|ddr[345]?)\b/i',
        '/\b(\d+)\s*gb\s*ddr[345]?\b/i',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $text, $match)) {
            return (float) $match[1];
        }
    }
    return null;
}

function extract_inches(string $text): ?float
{
    if (preg_match('/\b(1[4-9]|[2-8]\d)(?:[.,](\d))?\s*(?:\"|pulg|inch)/i', $text, $match)) {
        return (float) ($match[1] . (isset($match[2]) ? '.' . $match[2] : ''));
    }
    return null;
}

function extract_refresh_hz(string $text): float
{
    if (preg_match('/\b(\d{2,3})\s*hz\b/i', $text, $match)) {
        return max(50.0, min(500.0, (float) $match[1]));
    }
    return 60.0;
}

function cpu_score(string $text): float
{
    $tiers = [
        9.0 => ['/\b(?:core\s*)?i9\b/', '/\bryzen\s*9\b/'],
        7.0 => ['/\b(?:core\s*)?i7\b/', '/\bryzen\s*7\b/'],
        5.0 => ['/\b(?:core\s*)?i5\b/', '/\bryzen\s*5\b/'],
        3.5 => ['/\b(?:core\s*)?i3\b/', '/\bryzen\s*3\b/'],
        2.0 => ['/\bceleron\b/', '/\bpentium\b/', '/\bath(lon)?\b/', '/\bn\d{3,4}\b/'],
    ];
    foreach ($tiers as $score => $patterns) {
        if (has_any($text, $patterns)) {
            return (float) $score;
        }
    }
    return 1.0;
}

function gpu_score(string $text): float
{
    if (preg_match('/\brtx\s*([2345])\d{3}\b/', $text, $match)) {
        return 4.0 + (float) $match[1];
    }
    if (preg_match('/\b(?:gtx|rx)\s*\d{3,4}\b/', $text)) {
        return 4.0;
    }
    return 0.0;
}

function comparable_metrics(string $text, float $price): ?array
{
    if ($price <= 0) {
        return null;
    }

    $capacity = extract_capacity_gb($text);
    $ram = extract_ram_gb($text);

    if (has_any($text, ['/\bportatil\b/', '/\blaptop\b/', '/\bnotebook\b/']) && $ram !== null && $capacity !== null) {
        $performance = cpu_score($text) * 2 + min(32.0, $ram) / 4 + log(max(64.0, $capacity), 2) / 2 + gpu_score($text);
        return ['group' => 'laptop', 'score' => $performance / $price, 'metric' => sprintf('CPU %.1f, %.0f GB RAM, %.0f GB almacenamiento por %.2f EUR', cpu_score($text), $ram, $capacity, $price)];
    }

    $isCompleteDevice = has_any($text, [
        '/\bordenador\b/', '/\bpc\b/', '/\bimac\b/', '/\ball in one\b/', '/\bservidor\b/',
        '/\bnas\b/', '/\btablet\b/', '/\bsmartphone\b/', '/\bconsola\b/',
    ]);
    $isStorageAccessory = has_any($text, [
        '/\bcaja extern[ao]\b/', '/\bcarcasa\b/', '/\badaptador\b/', '/\bduplicador\b/', '/\bdocking\b/',
    ]);

    if (!$isCompleteDevice && !$isStorageAccessory && has_any($text, ['/\bssd\b/', '/\bnvme\b/', '/\bm\.2\b/']) && $capacity !== null) {
        $kind = has_any($text, ['/\bextern[oa]\b/', '/\bportable\b/']) ? 'external' : 'internal';
        return ['group' => "ssd-{$kind}", 'score' => $capacity / $price, 'metric' => sprintf('%.0f GB por %.2f EUR', $capacity, $price)];
    }

    if (!$isCompleteDevice && !$isStorageAccessory && has_any($text, ['/\bdisco duro\b/', '/\bhdd\b/']) && $capacity !== null) {
        $kind = has_any($text, ['/\bextern[oa]\b/', '/\bportable\b/']) ? 'external' : 'internal';
        return ['group' => "hdd-{$kind}", 'score' => $capacity / $price, 'metric' => sprintf('%.0f GB por %.2f EUR', $capacity, $price)];
    }

    if (!$isCompleteDevice && has_any($text, ['/\bmemoria ram\b/', '/\bmodulo de memoria\b/', '/\bddr[345]\b/', '/\bsodimm\b/']) && $ram !== null) {
        $generation = preg_match('/\bddr([345])\b/', $text, $match) ? 'ddr' . $match[1] : 'ram';
        return ['group' => "memory-{$generation}", 'score' => $ram / $price, 'metric' => sprintf('%.0f GB RAM por %.2f EUR', $ram, $price)];
    }

    if (has_any($text, ['/\bmonitor\b/', '/\bpantalla\b/'])) {
        $inches = extract_inches($text);
        if ($inches !== null) {
            $hz = extract_refresh_hz($text);
            return ['group' => 'monitor', 'score' => ($inches * sqrt($hz / 60)) / $price, 'metric' => sprintf('%.1f pulgadas, %.0f Hz por %.2f EUR', $inches, $hz, $price)];
        }
    }

    return null;
}

function usage_badges(string $text): array
{
    $badges = [];

    $gaming = has_any($text, [
        '/\bgaming\b/', '/\bgamer\b/', '/\bplaystation\b/', '/\bxbox\b/', '/\bnintendo switch\b/',
        '/\b(?:geforce\s*)?(?:rtx|gtx)\s*\d{3,4}\b/', '/\bradeon\s*rx\s*\d{3,4}\b/',
        '/\bsilla gaming\b/', '/\bvolante gaming\b/', '/\bteclado gaming\b/', '/\braton gaming\b/',
    ]);
    if ($gaming) {
        $badges['gaming'] = ['confidence' => 'alta', 'reason' => 'El nombre, la familia o las especificaciones identifican explícitamente un producto gaming.'];
    }

    $remote = has_any($text, [
        '/\bteletrabajo\b/', '/\bvideoconferencia\b/', '/\bwebcam\b/', '/\bcamara web\b/',
        '/\bdocking station\b/', '/\bestacion de acoplamiento\b/', '/\bjabra speak\b/', '/\bspeakerphone\b/',
        '/\bauricular(?:es)?\b.*\bmicrofono\b/', '/\bheadset\b/',
    ]);
    if ($remote) {
        $badges['remote-work'] = ['confidence' => 'alta', 'reason' => 'Es equipamiento directamente relacionado con videollamadas o un puesto de trabajo remoto.'];
    }

    $officeConsumable = has_any($text, [
        '/\btoner\b/', '/\bcartucho\b/', '/\btinta\b/', '/\btambor\b/', '/\bfusor\b/',
        '/\bcinturon\b/', '/\bcabezal\b/', '/\bdeposito de mantenimiento\b/', '/\bkit (?:de )?mantenimiento\b/',
    ]);
    $office = !$officeConsumable && has_any($text, [
        '/\bimpresora\b/', '/\bmultifuncion\b/', '/\bscanner\b/', '/\bescaner\b/', '/\bdestructora\b/',
        '/\bcalculadora\b/', '/\betiquetadora\b/', '/\bproyector\b/', '/\bofimatica\b/',
    ]);
    if ($office && !$gaming) {
        $badges['office'] = ['confidence' => 'alta', 'reason' => 'La tipología del producto corresponde claramente a tareas de oficina.'];
    }

    $business = has_any($text, [
        '/\bservidor\b/', '/\bserver\b/', '/\bnas\b/', '/\brack\b/', '/\bfirewall\b/', '/\bswitch gestionable\b/',
        '/\bsai\b/', '/\bsistema de alimentacion ininterrumpida\b/', '/\bups\s*(?:\d|linea|online|offline|sistema|rack)\b/',
        '/\bterminal punto de venta\b/', '/\btpv\b/', '/\blector codigo de barras\b/',
        '/\bimpresora de tickets\b/', '/\bcentralita\b/', '/\bvideovigilancia\b/',
    ]);
    if ($business) {
        $badges['business'] = ['confidence' => 'alta', 'reason' => 'Es infraestructura o equipamiento orientado específicamente a un entorno empresarial.'];
    }

    return $badges;
}

$badgeCountBefore = (int) $wpdb->get_var($wpdb->prepare(
    "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = %s",
    INFORVEL_BADGE_META_KEY
));

$products = $wpdb->get_results(
    "SELECT
        p.ID AS id,
        p.post_title AS title,
        p.post_name AS slug,
        price.meta_value AS price,
        stock_status.meta_value AS stock_status,
        stock.meta_value AS stock_quantity,
        attrs.meta_value AS attributes_data,
        family.meta_value AS supplier_family,
        subfamily.meta_value AS supplier_subfamily,
        maker.meta_value AS supplier_maker,
        existing.meta_value AS existing_badges,
        taxonomy.categories,
        taxonomy.category_slugs
    FROM {$wpdb->posts} p
    LEFT JOIN {$wpdb->postmeta} price ON price.post_id = p.ID AND price.meta_key = '_price'
    LEFT JOIN {$wpdb->postmeta} stock_status ON stock_status.post_id = p.ID AND stock_status.meta_key = '_stock_status'
    LEFT JOIN {$wpdb->postmeta} stock ON stock.post_id = p.ID AND stock.meta_key = '_stock'
    LEFT JOIN {$wpdb->postmeta} attrs ON attrs.post_id = p.ID AND attrs.meta_key = '_product_attributes'
    LEFT JOIN {$wpdb->postmeta} family ON family.post_id = p.ID AND family.meta_key = '_megasur_familia_original'
    LEFT JOIN {$wpdb->postmeta} subfamily ON subfamily.post_id = p.ID AND subfamily.meta_key = '_megasur_subfamilia_original'
    LEFT JOIN {$wpdb->postmeta} maker ON maker.post_id = p.ID AND maker.meta_key = '_megasur_fabricante'
    LEFT JOIN {$wpdb->postmeta} existing ON existing.post_id = p.ID AND existing.meta_key = '" . INFORVEL_BADGE_META_KEY . "'
    LEFT JOIN (
        SELECT tr.object_id,
            GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ' | ') AS categories,
            GROUP_CONCAT(DISTINCT t.slug ORDER BY t.slug SEPARATOR ' | ') AS category_slugs
        FROM {$wpdb->term_relationships} tr
        INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'product_cat'
        INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
        GROUP BY tr.object_id
    ) taxonomy ON taxonomy.object_id = p.ID
    WHERE p.post_type = 'product' AND p.post_status = 'publish'
    ORDER BY p.ID",
    ARRAY_A
);

$proposals = [];
$comparisonGroups = [];
$counts = ['gaming' => 0, 'remote-work' => 0, 'office' => 0, 'business' => 0, 'quality-price' => 0];

foreach ($products as $product) {
    $price = (float) $product['price'];
    $identity = normalize_catalog_text(implode(' ', [
        $product['title'],
        $product['supplier_family'],
        $product['supplier_subfamily'],
        $product['supplier_maker'],
    ]));
    $specificationText = remove_accents(mb_strtolower(wp_strip_all_tags($product['title'])));

    $badges = usage_badges($identity);
    foreach (array_keys($badges) as $badge) {
        $counts[$badge]++;
    }

    $index = count($proposals);
    $proposals[] = [
        'product_id' => (int) $product['id'],
        'product' => $product['title'],
        'slug' => $product['slug'],
        'price' => $price,
        'stock_status' => $product['stock_status'],
        'stock_quantity' => is_numeric($product['stock_quantity']) ? (int) $product['stock_quantity'] : null,
        'categories' => $product['categories'] ?: '',
        'existing_badges_raw' => $product['existing_badges'] ?: '',
        'proposed_badges' => $badges,
    ];

    if ($product['stock_status'] === 'instock') {
        $metrics = comparable_metrics($specificationText, $price);
        if ($metrics !== null) {
            $metrics['proposal_index'] = $index;
            $comparisonGroups[$metrics['group']][] = $metrics;
        }
    }
}

$qualityGroups = [];
foreach ($comparisonGroups as $group => $members) {
    if (count($members) < 8) {
        continue;
    }

    usort($members, static fn(array $a, array $b): int => $b['score'] <=> $a['score']);
    $selectionCount = max(1, (int) floor(count($members) * 0.15));
    $selected = array_slice($members, 0, $selectionCount);
    $qualityGroups[$group] = ['compared' => count($members), 'selected' => count($selected)];

    foreach ($selected as $member) {
        $index = $member['proposal_index'];
        $proposals[$index]['proposed_badges']['quality-price'] = [
            'confidence' => 'media',
            'reason' => sprintf(
                'Está en el 15%% superior de relación prestaciones/precio entre %d productos comparables del grupo %s (%s).',
                count($members),
                $group,
                $member['metric']
            ),
        ];
        $counts['quality-price']++;
    }
}

$proposals = array_values(array_filter(
    $proposals,
    static fn(array $proposal): bool => count($proposal['proposed_badges']) > 0
));

usort($proposals, static function (array $a, array $b): int {
    $badgeDiff = count($b['proposed_badges']) <=> count($a['proposed_badges']);
    return $badgeDiff !== 0 ? $badgeDiff : strcmp($a['product'], $b['product']);
});

$badgeCountAfter = (int) $wpdb->get_var($wpdb->prepare(
    "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = %s",
    INFORVEL_BADGE_META_KEY
));
$productsWithSales = (int) $wpdb->get_var(
    "SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key = 'total_sales' AND CAST(meta_value AS DECIMAL(20,4)) > 0"
);
$productsWithRatings = (int) $wpdb->get_var(
    "SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key = '_wc_average_rating' AND CAST(meta_value AS DECIMAL(10,4)) > 0"
);

$generatedAt = gmdate('c');
$summary = [
    'generated_at_utc' => $generatedAt,
    'mode' => 'dry-run / read-only',
    'published_products_analyzed' => count($products),
    'products_with_proposals' => count($proposals),
    'proposal_counts_by_badge' => $counts,
    'quality_price_comparison_groups' => $qualityGroups,
    'catalog_signals' => [
        'products_with_sales' => $productsWithSales,
        'products_with_ratings' => $productsWithRatings,
        'delivery_sla_available' => false,
    ],
    'withheld_badges' => [
        'recommended' => 'No hay ventas ni valoraciones registradas para justificar una recomendación objetiva.',
        'fast-delivery' => 'El stock de proveedor no acredita un plazo o SLA de entrega.',
    ],
    'review_notes' => [
        'Las categorías importadas no siempre corresponden con el nombre del producto; las reglas cruzan nombre y familia de proveedor.',
        'Calidad/precio es una preselección cuantitativa dentro de grupos comparables y requiere revisión comercial antes de aplicarse.',
    ],
    'database_write_guard' => [
        'badge_meta_rows_before' => $badgeCountBefore,
        'badge_meta_rows_after' => $badgeCountAfter,
        'unchanged' => $badgeCountBefore === $badgeCountAfter,
    ],
];

if (!is_dir(INFORVEL_BADGE_REPORT_DIR) && !mkdir(INFORVEL_BADGE_REPORT_DIR, 0775, true) && !is_dir(INFORVEL_BADGE_REPORT_DIR)) {
    throw new RuntimeException('Could not create report directory.');
}

$stamp = gmdate('Ymd-His');
$base = INFORVEL_BADGE_REPORT_DIR . "/badge-analysis-{$stamp}";
$jsonPath = $base . '.json';
$csvPath = $base . '.csv';
$markdownPath = $base . '.md';

file_put_contents($jsonPath, wp_json_encode(['summary' => $summary, 'proposals' => $proposals], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$csv = fopen($csvPath, 'wb');
fputcsv($csv, ['product_id', 'product', 'price', 'stock_status', 'categories', 'proposed_badges', 'confidence', 'reasons'], ';');
foreach ($proposals as $proposal) {
    $badges = array_keys($proposal['proposed_badges']);
    $confidences = array_map(static fn(array $badge): string => $badge['confidence'], $proposal['proposed_badges']);
    $reasons = array_map(static fn(array $badge): string => $badge['reason'], $proposal['proposed_badges']);
    fputcsv($csv, [
        $proposal['product_id'], $proposal['product'], $proposal['price'], $proposal['stock_status'],
        $proposal['categories'], implode(', ', $badges), implode(', ', $confidences), implode(' | ', $reasons),
    ], ';');
}
fclose($csv);

$lines = [
    '# Analisis de distintivos de producto', '',
    '- Generado: ' . $generatedAt,
    '- Modo: **solo lectura / dry-run**',
    '- Productos publicados analizados: ' . number_format(count($products), 0, ',', '.'),
    '- Productos con alguna propuesta: ' . number_format(count($proposals), 0, ',', '.'),
    '- Filas de distintivos antes/despues: ' . $badgeCountBefore . '/' . $badgeCountAfter,
    '- Productos con ventas registradas: ' . $productsWithSales,
    '- Productos con valoraciones: ' . $productsWithRatings,
    '', '## Totales propuestos', '',
];
foreach ($counts as $badge => $count) {
    $lines[] = '- ' . $badge . ': ' . number_format($count, 0, ',', '.');
}
$lines = array_merge($lines, [
    '', '## Distintivos retenidos', '',
    '- recommended: sin ventas ni valoraciones suficientes.',
    '- fast-delivery: el stock no demuestra un plazo de entrega.',
    '', '## Muestra de propuestas', '',
    '| ID | Producto | Precio | Propuestas |',
    '|---:|---|---:|---|',
]);
foreach (array_slice($proposals, 0, 100) as $proposal) {
    $name = str_replace('|', '/', $proposal['product']);
    $lines[] = sprintf('| %d | %s | %.2f EUR | %s |', $proposal['product_id'], $name, $proposal['price'], implode(', ', array_keys($proposal['proposed_badges'])));
}
file_put_contents($markdownPath, implode("\n", $lines) . "\n");

copy($jsonPath, INFORVEL_BADGE_REPORT_DIR . '/badge-analysis-latest.json');
copy($csvPath, INFORVEL_BADGE_REPORT_DIR . '/badge-analysis-latest.csv');
copy($markdownPath, INFORVEL_BADGE_REPORT_DIR . '/badge-analysis-latest.md');

echo wp_json_encode([
    'summary' => $summary,
    'reports' => ['json' => $jsonPath, 'csv' => $csvPath, 'markdown' => $markdownPath],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
