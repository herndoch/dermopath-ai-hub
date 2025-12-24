
const fs = require('fs');

// 1. Build Map from Skin_WHO.json
console.log("Reading Skin_WHO.json...");
const whoData = JSON.parse(fs.readFileSync('Skin_WHO.json', 'utf8'));
const idToGcsMap = new Map();

function extractIdFromUrl(url) {
    if (!url) return null;
    let match = url.match(/\/(\d+)\.(jpg|jpeg|png)$/);
    if (match) return parseInt(match[1]);

    match = url.match(/\/(\d+)_files\//);
    if (match) return parseInt(match[1]);

    match = url.match(/fid=(\d+)/);
    if (match) return parseInt(match[1]);

    return null;
}

// Helper to deduce extension from Source URL in Skin_WHO
function getExtension(url) {
    if (url.endsWith('.jpeg')) return '.jpeg';
    if (url.endsWith('.png')) return '.png';
    return '.jpg'; // default
}

let mapCount = 0;
whoData.forEach(entity => {
    if (entity.related_figures) {
        entity.related_figures.forEach(fig => {
            if (fig.id && (fig.gcs_path || fig.src)) {
                // Prefer gcs_path, fallback to src
                const path = fig.gcs_path || fig.src;
                // Ensure it points to storage.googleapis.com
                const cleanPath = path.replace('gs://pathology-hub-0/', 'https://storage.googleapis.com/pathology-hub-0/');
                idToGcsMap.set(parseInt(fig.id), cleanPath);
                mapCount++;
            }
        });
    }
});
console.log(`Built map with ${mapCount} entries.`);

// 2. Patch Skin_Global_Leaf_Optimized.json
console.log("Reading Skin_Global_Leaf_Optimized.json...");
const globalData = JSON.parse(fs.readFileSync('Skin_Global_Leaf_Optimized.json', 'utf8'));
let replacementCount = 0;
let missingInMapCount = 0;

function traverseAndReplace(obj) {
    if (!obj) return;
    if (typeof obj === 'object') {
        // Arrays or Objects
        for (const key in obj) {
            const val = obj[key];
            if (typeof val === 'string') {
                if (val.includes('tumourclassification.iarc.who.int')) {
                    const id = extractIdFromUrl(val);
                    if (id) {
                        const newUrl = idToGcsMap.get(id);
                        if (newUrl) {
                            obj[key] = newUrl;
                            replacementCount++;
                        } else {
                            // If missing in map, construct a best-guess GCS URL (default to .jpg)
                            // Most WHO images mirror to .jpg, but some .jpeg.
                            // We will try .jpg as safer default for the mirror bucket structure I saw.
                            const guessUrl = `https://storage.googleapis.com/pathology-hub-0/WHO/WHO_PICS/SKIN/${id}.jpg`;
                            obj[key] = guessUrl;
                            missingInMapCount++;
                            // console.log(`Warning: ID ${id} not found in map. Guessed: ${guessUrl}`);
                        }
                    }
                }
            } else {
                traverseAndReplace(val);
            }
        }
    }
}

traverseAndReplace(globalData);

console.log(`Replaced ${replacementCount} links using map.`);
console.log(`Replaced ${missingInMapCount} links using guess (missing in map).`);

// 3. Write Output
fs.writeFileSync('Skin_Global_Leaf_Optimized.json', JSON.stringify(globalData, null, 4));
console.log("Saved updated Skin_Global_Leaf_Optimized.json");
