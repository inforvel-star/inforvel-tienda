<?php
/**
 * Apply the approved product badge analysis to WooCommerce.
 *
 * Safety requires an explicit environment flag:
 *   INFORVEL_BADGE_APPLY=YES wp eval-file ... --path=/var/www/wp --allow-root
 */

if (!defined('ABSPATH')) {
    fwrite(STDERR, "Run this script through WP-CLI.\n");
    exit(1);
}

if (getenv('INFORVEL_BADGE_APPLY') !== 'YES') {
    fwrite(STDERR, "Refusing to write: set INFORVEL_BADGE_APPLY=YES.\n");
    exit(2);
}

global $wpdb;

const INFORVEL_BADGE_REPORT = '/var/www/frontend-dev/logs/product-badges/badge-analysis-latest.json';
const INFORVEL_BADGE_LOG_DIR = '/var/www/frontend-dev/logs/product-badges';
const INFORVEL_BADGE_META_KEY = '_inforvel_product_badges';
const INFORVEL_VALID_BADGES = [
    'recommended',
    'quality-price',
    'office',
    'remote-work',
    'gaming',
    'business',
    'fast-delivery',
];

function current_badges_for_product(int $productId): array
{
    $value = get_post_meta($productId, INFORVEL_BADGE_META_KEY, true);
    if (!is_array($value)) {
        return [];
    }

    return array_values(array_intersect(INFORVEL_VALID_BADGES, array_map('strval', $value)));
}

$reportRaw = file_get_contents(INFORVEL_BADGE_REPORT);
if ($reportRaw === false) {
    throw new RuntimeException('The approved analysis report could not be read.');
}

$report = json_decode($reportRaw, true, 512, JSON_THROW_ON_ERROR);
$proposals = $report['proposals'] ?? null;
$summary = $report['summary'] ?? [];

if (!is_array($proposals) || ($summary['mode'] ?? '') !== 'dry-run / read-only') {
    throw new RuntimeException('The report is not a valid dry-run analysis.');
}

if (($summary['database_write_guard']['unchanged'] ?? false) !== true) {
    throw new RuntimeException('The report failed its read-only database guard.');
}

$targets = [];
foreach ($proposals as $proposal) {
    $productId = (int) ($proposal['product_id'] ?? 0);
    $badgeMap = $proposal['proposed_badges'] ?? [];
    $badges = array_values(array_intersect(INFORVEL_VALID_BADGES, array_keys($badgeMap)));

    if ($productId <= 0 || !$badges) {
        continue;
    }

    if (get_post_type($productId) !== 'product') {
        throw new RuntimeException("Target {$productId} is no longer a product.");
    }

    $targets[$productId] = $badges;
}

if (!$targets || count($targets) !== (int) ($summary['products_with_proposals'] ?? -1)) {
    throw new RuntimeException('The target count does not match the approved report.');
}

$timestamp = gmdate('Ymd-His');
$backupPath = INFORVEL_BADGE_LOG_DIR . "/badge-apply-backup-{$timestamp}.json";
$resultPath = INFORVEL_BADGE_LOG_DIR . "/badge-apply-result-{$timestamp}.json";
$backup = [
    'created_at_utc' => gmdate('c'),
    'report_path' => INFORVEL_BADGE_REPORT,
    'report_sha256' => hash('sha256', $reportRaw),
    'meta_key' => INFORVEL_BADGE_META_KEY,
    'targets' => [],
];

foreach (array_keys($targets) as $productId) {
    $exists = metadata_exists('post', $productId, INFORVEL_BADGE_META_KEY);
    $backup['targets'][(string) $productId] = [
        'existed' => $exists,
        'value' => $exists ? get_post_meta($productId, INFORVEL_BADGE_META_KEY, true) : null,
    ];
}

if (file_put_contents($backupPath, wp_json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
    throw new RuntimeException('The pre-apply backup could not be written.');
}

$changed = 0;
$unchanged = 0;
$badgeTotals = array_fill_keys(INFORVEL_VALID_BADGES, 0);
$wpdb->query('START TRANSACTION');

try {
    foreach ($targets as $productId => $proposedBadges) {
        $currentBadges = current_badges_for_product($productId);
        $mergedBadges = array_values(array_intersect(
            INFORVEL_VALID_BADGES,
            array_unique(array_merge($currentBadges, $proposedBadges))
        ));

        foreach ($mergedBadges as $badge) {
            $badgeTotals[$badge]++;
        }

        if ($mergedBadges === $currentBadges) {
            $unchanged++;
            continue;
        }

        if (update_post_meta($productId, INFORVEL_BADGE_META_KEY, $mergedBadges) === false) {
            throw new RuntimeException("Could not update product {$productId}.");
        }
        $changed++;
    }

    $wpdb->query('COMMIT');
} catch (Throwable $exception) {
    $wpdb->query('ROLLBACK');
    throw $exception;
}

wp_cache_flush();

$storedRows = (int) $wpdb->get_var($wpdb->prepare(
    "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = %s",
    INFORVEL_BADGE_META_KEY
));
$result = [
    'applied_at_utc' => gmdate('c'),
    'report_sha256' => hash('sha256', $reportRaw),
    'targets' => count($targets),
    'changed' => $changed,
    'unchanged' => $unchanged,
    'stored_meta_rows' => $storedRows,
    'badge_totals_on_targets' => array_filter($badgeTotals),
    'backup_path' => $backupPath,
];

file_put_contents($resultPath, wp_json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
copy($backupPath, INFORVEL_BADGE_LOG_DIR . '/badge-apply-backup-latest.json');
copy($resultPath, INFORVEL_BADGE_LOG_DIR . '/badge-apply-result-latest.json');

echo wp_json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
