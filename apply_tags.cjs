const fs = require('fs');

const DATA_FILE = 'public/GLOBAL_KNOWLEDGE_BASE.json';
const MAPPING_FILE = 'tag-mapping.txt';

try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));

    // Re-create the list of unclassified items to match indices
    // Must use EXACT logic from extract_unclassified.cjs
    const unclassifiedItems = data.filter(item =>
        (item.tags && item.tags.some(t => t.includes('Unclassified'))) ||
        item.entity_name === 'Unclassified'
    );

    console.log(`Found ${unclassifiedItems.length} unclassified items to process.`);
    console.log(`Mapping has ${Object.keys(mapping).length} entries.`);

    let updatedCount = 0;

    unclassifiedItems.forEach((item, index) => {
        const newTag = mapping[String(index)];

        if (newTag && newTag !== "Skin::Unclassified") {
            // Updated Tag
            item.tags = [newTag];

            // Update Name if generic
            if (item.entity_name === 'Unclassified') {
                // Derive from tag: Skin::...::Last_Segment -> Last Segment
                const parts = newTag.split('::');
                const lastPart = parts[parts.length - 1];
                // Replace underscores with spaces
                item.entity_name = lastPart.replace(/_/g, ' ');
            }
            updatedCount++;
        }
    });

    console.log(`Updated ${updatedCount} items.`);

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

} catch (e) {
    console.error("Error processing tags:", e);
}
