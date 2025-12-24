import { GoogleGenAI } from "@google/genai";
import { DiseaseEntity } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: 'AIzaSyAjU9tpcSDBfZZEUw2trqYHW2UlWjtYFPk' });

export const askGeminiAboutEntity = async (
  entity: DiseaseEntity,
  question: string
): Promise<string> => {
  try {
    const context = JSON.stringify(entity, null, 2);

    const prompt = `
      You are an expert dermatopathologist assistant.
      
      Here is the clinical and pathological data for the disease entity: "${entity.entity_name}".
      
      DATA CONTEXT:
      ${context}
      
      USER QUESTION:
      ${question}
      
      Instructions:
      1. Answer the user's question strictly based on the provided data context if possible.
      2. If the data is missing from the context, you may use your general medical knowledge but explicitly state that the information comes from general knowledge and not the specific record.
      3. Be concise, professional, and use medical terminology appropriate for a pathologist.
      4. Format the output with Markdown for readability.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Handle different response structures across SDK versions
    let text = "";
    if (typeof (response as any).text === 'string') {
      text = (response as any).text;
    } else if (typeof (response as any).text === 'function') {
      text = (response as any).text();
    } else if ((response as any).response?.text && typeof (response as any).response.text === 'function') {
      text = (response as any).response.text();
    } else if ((response as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (response as any).candidates[0].content.parts[0].text;
    }

    return text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error while processing your request. Please try again.";
  }
};

export interface AIQueryAnalysis {
  target_entity_name: string | null;
  keywords: string[];
  target_section: string | null;
}

export const parseSearchQuery = async (query: string): Promise<AIQueryAnalysis> => {
  try {
    const prompt = `
      You are an expert dermatopathologist assistant. Analyze the user's search query and extract structured data.
      
      Query: "${query}"
      
      Tasks:
      1. Identify if a specific disease entity is mentioned (e.g. "Basal Cell Carcinoma", "Spitz Nevus").
      2. Extract key medical terms/keywords to search for, excluding the entity name itself.
      3. Identify if a specific section is requested (e.g. "histology" -> "microscopic", "prognosis", "IHC" -> "ancillary_studies", "clinical").
      
      Return ONLY a JSON object with these keys:
      - target_entity_name: string | null
      - keywords: string[]
      - target_section: string | null (Use keys: definition, clinical, microscopic, pathogenesis, macroscopic, ancillary_studies, prognosis_and_prediction, differential_diagnosis)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    let text = "";
    if (typeof (response as any).text === 'string') {
      text = (response as any).text;
    } else if (typeof (response as any).text === 'function') {
      text = (response as any).text();
    } else if ((response as any).response?.text && typeof (response as any).response.text === 'function') {
      text = (response as any).response.text();
    } else if ((response as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (response as any).candidates[0].content.parts[0].text;
    }

    if (!text) return { target_entity_name: null, keywords: [], target_section: null };

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Parse Query Error:", error);
    return { target_entity_name: null, keywords: [], target_section: null };
  }
};

export const generateAnswer = async (context: string, query: string): Promise<string> => {
  try {
    const prompt = `
      You are an expert dermatopathologist.
      
      Context from Database:
      ${context}
      
      User Query: "${query}"
      
      Instructions:
      1. Based STRICTLY on the provided context, answer the user's query concisely (max 3-4 sentences).
      2. If the context contains specific details relevant to the query (e.g. IHC markers, prognostic factors), cite them.
      3. If the context doesn't contain the answer, say "I couldn't find specific details in the database."
      4. Use professional medical terminology.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    let text = "";
    if (typeof (response as any).text === 'string') {
      text = (response as any).text;
    } else if (typeof (response as any).text === 'function') {
      text = (response as any).text();
    } else if ((response as any).response?.text && typeof (response as any).response.text === 'function') {
      text = (response as any).response.text();
    } else if ((response as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (response as any).candidates[0].content.parts[0].text;
    }

    return text || "No answer generated.";
  } catch (error) {
    console.error("AI Generate Answer Error:", error);
    return "Error generating answer.";
  }
};

export const cleanEntityContent = async (
  entity: DiseaseEntity
): Promise<Partial<DiseaseEntity>> => {
  try {
    const prompt = `
      System Role: Expert Medical Pathology Editor

    Task: Convert concatenated, repetitive raw text into a clean, structured study guide.
      
      Processing Rules:

    Structure: Organize into standard headers: Definition, Clinical Features, Microscopic Findings, Differential Diagnosis, Prognosis.

      Deduplicate: The input contains multiple versions of the same information(e.g., from[McKee] vs.standard text).Merge them.Do not repeat facts.

        Synthesize: Combine unique details(e.g., "glycogen," "elastic fibers," "1.5 cm") into single, coherent bullet points.

          Formatting: Use Markdown.Bold key terms(e.g., ** Key Feature:**).Use nested bullets for readability.

            Tone: Professional, concise, and academic.
      
      CRITICAL INSTRUCTIONS:
    1. COHESION: Ensure each section flows as a single narrative.
      2. SOURCE REMOVAL: Completely OMIT any source markers like "--- [Source: ...] ---" or "[McKee]" in the synthesized text.The user will view raw text if they want sources.
      3. JSON OUTPUT ONLY: Your output must be ONLY the JSON object.No markdown code blocks around the JSON.

      STRUCTURE:
    {
      "definition": "...",
        "clinical": "...",
          "microscopic": "...",
            "pathogenesis": "...", // If present
              "macroscopic": "...", // If present
                "ancillary_studies": "...", // If present
                  "prognosis_and_prediction": "...",
                    "differential_diagnosis": "..."
    }
      
      RAW DATA TO SYNTHESIZE:
      ${JSON.stringify({
      entity_name: entity.entity_name,
      definition: entity.definition,
      clinical: entity.clinical,
      microscopic: entity.microscopic,
      pathogenesis: entity.pathogenesis,
      macroscopic: entity.macroscopic,
      ancillary_studies: entity.ancillary_studies,
      prognosis_and_prediction: entity.prognosis_and_prediction,
      differential_diagnosis: entity.differential_diagnosis
    }, null, 2)
      }
    `;

    console.log(`[Gemini] Starting synthesis for: ${entity.entity_name} `);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Handle different response structures across SDK versions
    let text = "";
    if (typeof (response as any).text === 'string') {
      text = (response as any).text;
    } else if (typeof (response as any).text === 'function') {
      text = (response as any).text();
    } else if ((response as any).response?.text && typeof (response as any).response.text === 'function') {
      text = (response as any).response.text();
    } else if ((response as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (response as any).candidates[0].content.parts[0].text;
    }

    if (!text) {
      console.warn("No text extracted from Gemini response:", response);
      return {};
    }

    // Remove potential markdown code blocks if AI included them
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);
    console.log(`[Gemini] Synthesis complete for: ${entity.entity_name}`, result);
    return result;
  } catch (error) {
    console.error("Gemini Clean Content Error:", error);
    return {};
  }
};