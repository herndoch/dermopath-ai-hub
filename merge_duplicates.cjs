const fs = require('fs');

// Config
const INPUT_FILE = 'public/GLOBAL_KNOWLEDGE_BASE.json';
const OUTPUT_FILE = 'public/GLOBAL_KNOWLEDGE_BASE.json'; // Overwrite!
const BACKUP_FILE = 'public/GLOBAL_KNOWLEDGE_BASE.bak.json';

// Helpers
function getPrimaryTag(item) {
    if (!item.tags || item.tags.length === 0) return null;
    // Filter out generic tags
    const candidates = item.tags.filter(t =>
        !t.includes('Unclassified') &&
        !t.endsWith('::Overview_NOS') && // Maybe exclude these? No, keep them.
        t !== 'Skin'
    );

    if (candidates.length === 0) return null; // Only unclassified

    // Sort by depth (number of ::), then length
    candidates.sort((a, b) => {
        const depthA = a.split('::').length;
        const depthB = b.split('::').length;
        if (depthA !== depthB) return depthB - depthA;
        return b.length - a.length;
    });

    return candidates[0];
}

function mergeItems(items) {
    if (items.length === 0) return null;
    if (items.length === 1) return items[0];

    // Base: longest entity name
    items.sort((a, b) => b.entity_name.length - a.entity_name.length);
    const primary = items[0];

    const result = { ...primary };

    // Arrays to merge
    const arrayFields = ['tags', 'media', 'related_figures', 'differential_diagnosis_links']; // Add others if needed
    const textFields = ['definition', 'clinical', 'microscopic', 'macroscopic', 'pathogenesis', 'ancillary_studies', 'prognosis_and_prediction'];

    // 1. Tags
    const allTags = new Set();
    items.forEach(i => (i.tags || []).forEach(t => allTags.add(t)));
    result.tags = Array.from(allTags);

    // 2. Media (deduplicate by path/url)
    const mediaMap = new Map();
    items.forEach(i => {
        (i.media || []).forEach(m => {
            const key = m.path || m.url;
            if (key) mediaMap.set(key, m);
        });
        (i.related_figures || []).forEach(m => {
            // normalize to media item for storage if needed, or keep distinct?
            // The schema has specific types. Let's merge related_figures separately.
        });
    });
    result.media = Array.from(mediaMap.values());

    // 3. Related Figures
    if (items.some(i => i.related_figures)) {
        const figMap = new Map();
        items.forEach(i => (i.related_figures || []).forEach(f => {
            const key = f.gcs_path || f.wsi_link;
            if (key) figMap.set(key, f);
        }));
        result.related_figures = Array.from(figMap.values());
    }

    // 4. Text Fields
    textFields.forEach(field => {
        const uniqueTexts = new Set();
        items.forEach(i => {
            const val = i[field];
            if (val && typeof val === 'string' && val.trim().length > 0) {
                uniqueTexts.add(val.trim());
            }
        });
        if (uniqueTexts.size > 0) {
            result[field] = Array.from(uniqueTexts).join('\n\n---\n\n');
        }
    });

    return result;
}

// Main
try {
    console.log(`Reading ${INPUT_FILE}...`);
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2)); // Backup

    console.log(`Total items before: ${data.length}`);

    // Grouping Strategy
    // Map: PrimaryTag -> [items]
    // Unclassified/NoTag items go to "Ungrouped" list
    const groups = {};
    const ungrouped = [];

    data.forEach(item => {
        const tag = getPrimaryTag(item);
        if (tag) {
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(item);
        } else {
            ungrouped.push(item);
        }
    });

    console.log(`Grouped items into ${Object.keys(groups).length} unique primary tags.`);
    console.log(`Ungrouped items: ${ungrouped.length}`);

    const mergedItems = [];

    // Process groups
    for (const [tag, items] of Object.entries(groups)) {
        if (items.length > 1) {
            // MERGE
            mergedItems.push(mergeItems(items));
        } else {
            mergedItems.push(items[0]);
        }
    }

    // Combine
    const finalData = [...mergedItems, ...ungrouped];
    console.log(`Total items after merge: ${finalData.length}`);
    console.log(`Reduced by: ${data.length - finalData.length}`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log("Done.");

} catch (e) {
    console.error("Error:", e);
}
