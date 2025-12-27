const fs = require('fs');
const path = require('path');

const MAIN_DB_PATH = 'public/GLOBAL_KNOWLEDGE_BASE.json';
const TAGGED_FILE = 'entities_tagged.json';

// Read Main DB
let mainData = [];
try {
    mainData = JSON.parse(fs.readFileSync(MAIN_DB_PATH, 'utf8'));
} catch (e) {
    console.error("Failed to read main DB:", e);
    process.exit(1);
}

// Read Tagged Data
let taggedData = [];
try {
    taggedData = JSON.parse(fs.readFileSync(TAGGED_FILE, 'utf8'));
} catch (e) {
    console.error("Failed to read tagged file:", e);
    process.exit(1);
}

// Create a map for quick lookup by name
const taggedMap = new Map();
taggedData.forEach(item => {
    // Some items might have subtle name differences, but let's try exact first
    taggedMap.set(item.entity_name.toLowerCase(), item.tags);
});

let updatedCount = 0;

mainData.forEach(item => {
    const manualTags = taggedMap.get(item.entity_name.toLowerCase());
    if (manualTags && manualTags.length > 0) {
        // Merge tags
        const currentTags = new Set(item.tags || []);

        // If we are applying manual tags, we often want to remove the "Unclassified" marker if it was the only one
        if (currentTags.has("Skin::Unclassified")) {
            currentTags.delete("Skin::Unclassified");
        }

        manualTags.forEach(t => {
            if (t && t !== "Skin::Unclassified") {
                currentTags.add(t);
            }
        });

        item.tags = Array.from(currentTags);
        updatedCount++;
    }
});

console.log(`Applied manual tags to ${updatedCount} entities.`);

fs.writeFileSync(MAIN_DB_PATH, JSON.stringify(mainData, null, 2));
console.log("Written to GLOBAL_KNOWLEDGE_BASE.json");
