
import { parseSearchQuery } from './services/geminiService';

async function test() {
    const query = "histolgy of bcc";
    console.log(`Testing query: "${query}"`);

    try {
        const result = await parseSearchQuery(query);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

test();
