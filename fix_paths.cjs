const fs = require('fs');

const FILE_PATH = 'public/Skin_Global_Leaf_Optimized.json';

console.log(`Reading ${FILE_PATH}...`);
const data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

let count = 0;

function fixPath(path) {
    if (!path) return path;
    // Check if it starts with textbooks/ or lectures/ but NOT _asset_library/
    if ((path.startsWith('textbooks/') || path.startsWith('lectures/')) && !path.startsWith('_asset_library/')) {
        return `_asset_library/${path}`;
    }
    return path;
}

function processItem(item) {
    let fixed = false;
    if (item.path) {
        const original = item.path;
        const fixedPath = fixPath(original);
        if (original !== fixedPath) {
            item.path = fixedPath;
            fixed = true;
            count++;
        }
    }
    // Also check related_figures if they exist (though we saw they might not be in top-level)
    if (item.media) {
        item.media.forEach(m => {
            if (m.path) {
                const original = m.path;
                const fixedPath = fixPath(original);
                if (original !== fixedPath) {
                    m.path = fixedPath;
                    fixed = true;
                    count++;
                }
            }
        });
    }
    if (item.related_figures) {
        item.related_figures.forEach(m => {
            if (m.path) {
                const original = m.path;
                const fixedPath = fixPath(original);
                if (original !== fixedPath) {
                    m.path = fixedPath;
                    fixed = true;
                    count++;
                }
            }
        });
    }
    return fixed;
}

data.forEach(processItem);

console.log(`Fixed ${count} paths.`);

fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 4));
console.log(`Saved updated JSON to ${FILE_PATH}`);
