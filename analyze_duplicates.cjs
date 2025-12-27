const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/GLOBAL_KNOWLEDGE_BASE.json', 'utf8'));

const tagCounts = {};
const nameCounts = {};

data.forEach((item, index) => {
    // Check tags
    if (item.tags) {
        item.tags.forEach(tag => {
            if (!tagCounts[tag]) tagCounts[tag] = [];
            tagCounts[tag].push(index);
        });
    }
    // Check names
    if (item.entity_name) {
        if (!nameCounts[item.entity_name]) nameCounts[item.entity_name] = [];
        nameCounts[item.entity_name].push(index);
    }
});

// Report duplicates
console.log("--- Duplicate Tags (Top 10) ---");
Object.entries(tagCounts)
    .filter(([tag, indices]) => indices.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([tag, indices]) => {
        console.log(`Tag: "${tag}" Count: ${indices.length}`);
        // Print first 2 entity names for this tag
        console.log(`   Examples: "${data[indices[0]].entity_name}", "${data[indices[1]].entity_name}"`);
    });

console.log("\n--- Duplicate Entity Names (Top 10) ---");
Object.entries(nameCounts)
    .filter(([name, indices]) => indices.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([name, indices]) => {
        console.log(`Name: "${name}" Count: ${indices.length}`);
    });
