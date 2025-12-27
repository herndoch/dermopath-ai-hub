const fs = require('fs');
const path = require('path');

const ROOT_DB_PATH = 'GLOBAL_KNOWLEDGE_BASE.json';
const PUBLIC_DB_PATH = 'public/GLOBAL_KNOWLEDGE_BASE.json';
const MASTERS_DIR = 'derm_masters';

// Read Main DB (from Root as source of truth if exists, else Public)
let mainData = [];
let targetPath = ROOT_DB_PATH;

if (fs.existsSync(ROOT_DB_PATH)) {
    mainData = JSON.parse(fs.readFileSync(ROOT_DB_PATH, 'utf8'));
} else if (fs.existsSync(PUBLIC_DB_PATH)) {
    mainData = JSON.parse(fs.readFileSync(PUBLIC_DB_PATH, 'utf8'));
    targetPath = PUBLIC_DB_PATH;
} else {
    console.error("No knowledge base found.");
    process.exit(1);
}

// Map for quick lookup by name
const nameMap = new Map();
mainData.forEach((item, index) => {
    nameMap.set(item.entity_name.toLowerCase(), index);
});

// Helper check tags
function findIndexByTags(tags) {
    if (!tags || tags.length === 0) return -1;
    for (let i = 0; i < mainData.length; i++) {
        const item = mainData[i];
        if (item.tags && item.tags.some(t => tags.includes(t))) {
            return i;
        }
    }
    return -1;
}

// Process files
const files = fs.readdirSync(MASTERS_DIR).filter(f => f.endsWith('.json'));

console.log(`Processing ${files.length} master files...`);

let addedCount = 0;
let updatedCount = 0;

files.forEach(file => {
    const filePath = path.join(MASTERS_DIR, file);
    const sourceDocName = file.replace('_MASTER.json', '');
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const items = JSON.parse(fileContent);

        items.forEach(newItem => {
            // Add Metadata
            newItem.source_document = sourceDocName;
            newItem.source_type = "Lecture";
            newItem.gcs_origin = `gs://pathology-hub-0/_content_library/lectures/${file}`;

            // Find match
            let index = nameMap.get(newItem.entity_name.toLowerCase());

            if (index === undefined) {
                index = findIndexByTags(newItem.tags);
            }

            if (index !== undefined && index !== -1) {
                // Update existing
                const existing = mainData[index];

                if (!existing.definition && newItem.definition) existing.definition = newItem.definition;
                if (!existing.clinical && newItem.clinical) existing.clinical = newItem.clinical;
                if (!existing.microscopic && newItem.microscopic) existing.microscopic = newItem.microscopic;
                if (!existing.pathogenesis && newItem.pathogenesis) existing.pathogenesis = newItem.pathogenesis;

                // Set source if not set or if it's currently generic
                if (!existing.source_document || existing.source_document === "Unknown") {
                    existing.source_document = newItem.source_document;
                    existing.source_type = newItem.source_type;
                }

                // Append Media / Figures
                if (newItem.related_figures) {
                    const existingFigures = existing.related_figures || [];
                    const newFigures = newItem.related_figures.map(f => {
                        let timestamp = f.timestamp || null;
                        if (!timestamp && f.legend) {
                            const timeMatch = f.legend.match(/\(Time:\s*(\d+)s?\)/i);
                            if (timeMatch) {
                                timestamp = parseInt(timeMatch[1]);
                            }
                        }
                        return {
                            ...f,
                            gcs_path: f.gcs_path || f.src,
                            isWSI: false,
                            timestamp: timestamp
                        };
                    });

                    // Deduplicate & Update
                    newFigures.forEach(nf => {
                        const existingFig = existingFigures.find(ef => ef.gcs_path === nf.gcs_path);
                        if (existingFig) {
                            if (!existingFig.timestamp && nf.timestamp) {
                                existingFig.timestamp = nf.timestamp;
                            }
                        } else {
                            existingFigures.push(nf);
                        }
                    });
                    existing.related_figures = existingFigures;
                }

                // Add tag if missing
                if (newItem.tags) {
                    const currentTags = new Set(existing.tags || []);
                    newItem.tags.forEach(t => currentTags.add(t));
                    existing.tags = Array.from(currentTags);
                }

                updatedCount++;
            } else {
                // Add new
                mainData.push(newItem);
                nameMap.set(newItem.entity_name.toLowerCase(), mainData.length - 1);
                addedCount++;
            }
        });

    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});

console.log(`Integration Complete.`);
console.log(`- Added: ${addedCount}`);
console.log(`- Updated: ${updatedCount}`);
console.log(`- Total Entities: ${mainData.length}`);

// Write to both locations
const output = JSON.stringify(mainData, null, 2);
fs.writeFileSync(ROOT_DB_PATH, output);
fs.writeFileSync(PUBLIC_DB_PATH, output);
console.log("Updated GLOBAL_KNOWLEDGE_BASE.json in both root and public/");
