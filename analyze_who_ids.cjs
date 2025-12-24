
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('Skin_Global_Leaf_Optimized.json', 'utf8'));
const whoIds = [];

function findWhoLinks(obj) {
    if (!obj) return;
    if (typeof obj === 'string') {
        if (obj.includes('tumourclassification.iarc.who.int')) {
            const match = obj.match(/(\d+)_files/);
            if (match) {
                whoIds.push(parseInt(match[1]));
            } else {
                // Check if it's the other format ID=...
                const match2 = obj.match(/fid=(\d+)/);
                if (match2) whoIds.push(parseInt(match2[1]));
            }
        }
    } else if (typeof obj === 'object') {
        for (const key in obj) {
            findWhoLinks(obj[key]);
        }
    }
}

findWhoLinks(data);

const uniqueIds = [...new Set(whoIds)].sort((a, b) => a - b);
console.log("Total WHO Links:", whoIds.length);
console.log("Unique IDs:", uniqueIds.length);
console.log("Min ID:", uniqueIds[0]);
console.log("Max ID:", uniqueIds[uniqueIds.length - 1]);
console.log("First 10:", uniqueIds.slice(0, 10));
console.log("Last 10:", uniqueIds.slice(-10));
