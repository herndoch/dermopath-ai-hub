const fs = require('fs');

const INPUT_FILE = 'public/GLOBAL_KNOWLEDGE_BASE.json';

// Expanded Keyword Map based on common dermpath diagnoses
const KEYWORD_MAP = {
    // Inflammatory
    "psoriasis": "Skin::Inflammatory::Psoriasiform::Psoriasis",
    "lichen planus": "Skin::Inflammatory::Interface::Lichen_Planus",
    "lichen": "Skin::Inflammatory::Interface::Lichenoid_Dermatitis_NOS",
    "dermatitis": "Skin::Inflammatory::Spongiotic::Dermatitis_NOS",
    "eczema": "Skin::Inflammatory::Spongiotic::Dermatitis_NOS",
    "granuloma annulare": "Skin::Inflammatory::Granulomatous::Granuloma_Annulare",
    "granuloma": "Skin::Inflammatory::Granulomatous::Granuloma_NOS",
    "sarcoid": "Skin::Inflammatory::Granulomatous::Sarcoidosis",
    "necrobiosis": "Skin::Inflammatory::Granulomatous::Necrobiosis_Lipoidica",
    "vasculitis": "Skin::Inflammatory::Vascular::Vasculitis_Overview",
    "pemphigus": "Skin::Inflammatory::Blistering::Pemphigus_Overview",
    "pemphigoid": "Skin::Inflammatory::Blistering::Bullous_Pemphigoid",
    "lupus": "Skin::Inflammatory::Connective_Tissue::Lupus_Erythematosus_Overview",
    "scleroderma": "Skin::Inflammatory::Connective_Tissue::Scleroderma",
    "morphea": "Skin::Inflammatory::Connective_Tissue::Morphea",
    "dermatomyositis": "Skin::Inflammatory::Interface::Dermatomyositis",
    "graft versus host": "Skin::Inflammatory::Interface::Graft_Versus_Host_Disease_Acute",
    "gvhd": "Skin::Inflammatory::Interface::Graft_Versus_Host_Disease_Acute",
    "drug eruption": "Skin::Inflammatory::Drug_Eruption::Drug_Eruption_Overview_NOS",
    "drug reaction": "Skin::Inflammatory::Drug_Eruption::Drug_Eruption_Overview_NOS",
    "panniculitis": "Skin::Inflammatory::Panniculitis::Panniculitis_Overview_NOS",
    "acne": "Skin::Inflammatory::Follicular::Acne_Vulgaris",
    "rosacea": "Skin::Inflammatory::Follicular::Rosacea",
    "alopecia": "Skin::Inflammatory::Alopecia::Alopecia_Overview_NOS",

    // Neoplastic - Epidermal
    "basal cell": "Skin::Neoplastic::Epidermal::Malignant::Basal_Cell_Carcinoma_Overview_NOS",
    "bcc": "Skin::Neoplastic::Epidermal::Malignant::Basal_Cell_Carcinoma_Overview_NOS",
    "squamous cell": "Skin::Neoplastic::Epidermal::Malignant::Squamous_Cell_Carcinoma_Overview",
    "scc": "Skin::Neoplastic::Epidermal::Malignant::Squamous_Cell_Carcinoma_Overview",
    "bowen": "Skin::Neoplastic::Epidermal::Malignant::Squamous_Cell_Carcinoma_In_Situ_Bowens",
    "actinic": "Skin::Neoplastic::Epidermal::Pre_Malignant::Actinic_Keratosis",
    "keratoacanthoma": "Skin::Neoplastic::Epidermal::Malignant::Keratoacanthoma",
    "seborrheic keratosis": "Skin::Neoplastic::Epidermal::Benign::Seborrheic_Keratosis",
    "seborrheic keratoses": "Skin::Neoplastic::Epidermal::Benign::Seborrheic_Keratosis",
    "verruca": "Skin::Infectious::Viral::Verruca_Vulgaris",
    "wart": "Skin::Infectious::Viral::Verruca_Vulgaris",
    "condyloma": "Skin::Infectious::Viral::Condyloma_Acuminatum",

    // Neoplastic - Melanocytic
    "melanoma": "Skin::Neoplastic::Melanocytic::Malignant::Melanoma_Overview_NOS",
    "nevus": "Skin::Neoplastic::Melanocytic::Benign::Nevus_Overview_NOS",
    "nevi": "Skin::Neoplastic::Melanocytic::Benign::Nevus_Overview_NOS",
    "lentigo": "Skin::Neoplastic::Melanocytic::Benign::Lentigo_Simplex",
    "spitz": "Skin::Neoplastic::Melanocytic::Benign::Spitz_Nevus",

    // Neoplastic - Adnexal
    "trichoepithelioma": "Skin::Neoplastic::Adnexal::Follicular::Trichoepithelioma",
    "pilomatricoma": "Skin::Neoplastic::Adnexal::Follicular::Pilomatricoma",
    "sebaceous": "Skin::Neoplastic::Adnexal::Sebaceous::Sebaceous_Adenoma",
    "poroma": "Skin::Neoplastic::Adnexal::Eccrine::Poroma",
    "cylindroma": "Skin::Neoplastic::Adnexal::Apocrine::Cylindroma",
    "spiradenoma": "Skin::Neoplastic::Adnexal::Eccrine::Spiradenoma",
    "hidradenoma": "Skin::Neoplastic::Adnexal::Eccrine::Nodular_Hidradenoma",
    "syringoma": "Skin::Neoplastic::Adnexal::Eccrine::Syringoma",

    // Neoplastic - Soft Tissue
    "dermatofibroma": "Skin::Soft_Tissue::Fibrohistiocytic::Dermatofibroma",
    "fibrous histiocytoma": "Skin::Soft_Tissue::Fibrohistiocytic::Dermatofibroma",
    "fibroxanthoma": "Skin::Soft_Tissue::Fibrohistiocytic::Atypical_Fibroxanthoma",
    "afx": "Skin::Soft_Tissue::Fibrohistiocytic::Atypical_Fibroxanthoma",
    "dfsp": "Skin::Soft_Tissue::Fibrohistiocytic::Dermatofibrosarcoma_Protuberans",
    "lipoma": "Skin::Soft_Tissue::Adipocytic::Lipoma",
    "angiolipoma": "Skin::Soft_Tissue::Adipocytic::Angiolipoma",
    "leiomyoma": "Skin::Soft_Tissue::Smooth_Muscle::Leiomyoma",
    "neurofibroma": "Skin::Soft_Tissue::Neural::Neurofibroma",
    "schwannoma": "Skin::Soft_Tissue::Neural::Schwannoma",
    "angioma": "Skin::Soft_Tissue::Vascular::Hemangioma_Overview",
    "hemangioma": "Skin::Soft_Tissue::Vascular::Hemangioma_Overview",
    "kaposi": "Skin::Neoplastic::Vascular::Malignant::Kaposi_Sarcoma",
    "angiosarcoma": "Skin::Neoplastic::Vascular::Malignant::Angiosarcoma",

    // Neoplastic - Lymphoid
    "mycosis fungoides": "Skin::Neoplastic::Lymphoid::T_Cell_Lymphoma::Mycosis_Fungoides",
    "sezary": "Skin::Neoplastic::Lymphoid::T_Cell_Lymphoma::Sezary_Syndrome",
    "lymphoma": "Skin::Neoplastic::Lymphoid::Lymphoma_Overview",
    "leukemia": "Skin::Neoplastic::Lymphoid::Leukemia_Cutis",

    // Infections
    "tinea": "Skin::Infectious::Fungal::Dermatophytosis",
    "herpes": "Skin::Infectious::Viral::Herpesvirus_NOS",
    "molluscum": "Skin::Infectious::Viral::Molluscum_Contagiosum",
    "leishmaniasis": "Skin::Infectious::Parasitic::Leishmaniasis",
    "scabies": "Skin::Infectious::Parasitic::Scabies_Sarcoptes_Scabiei",

    // Cysts
    "cyst": "Skin::Cystic::Cyst_Overview_NOS",
    "epidermal inclusion": "Skin::Cystic::Epidermoid_Cyst",
    "pilar": "Skin::Cystic::Trichilemmal_Cyst",
    "steatocystoma": "Skin::Cystic::Steatocystoma",

    // Other
    "scar": "Skin::Inflammatory::Repair::Scar",
    "keloid": "Skin::Inflammatory::Repair::Keloid",
    "amyloid": "Skin::Depositions::Amyloidosis",
    "mucin": "Skin::Depositions::Mucinosis_Overview",
    "calcinosis": "Skin::Depositions::Calcinosis_Cutis"
};

try {
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    let reclassifiedCount = 0;
    let stillUnclassified = 0;

    data.forEach(item => {
        let isUnclassified = false;

        // Check if explicitly unclassified or if name is generic "Unclassified"
        if (item.entity_name === "Unclassified" ||
            (item.tags && item.tags.some(t => t.includes("Unclassified")))) {
            isUnclassified = true;
        }

        if (isUnclassified) {
            let nameToCheck = item.entity_name.toLowerCase();
            let newName = item.entity_name;

            // If name is generic, try to find a better name from media legends
            if (nameToCheck === "unclassified" || nameToCheck === "unknown") {
                // Check related_figures first (often richer for WSI)
                const usefulFigure = (item.related_figures || []).find(m => m.legend && m.legend !== "Unclassified" && m.legend.length > 3);
                if (usefulFigure) {
                    nameToCheck = usefulFigure.legend.toLowerCase();
                    newName = usefulFigure.legend;
                } else {
                    // Fallback to media
                    const usefulMedia = (item.media || []).find(m => m.legend && m.legend !== "Unclassified" && m.legend.length > 3);
                    if (usefulMedia) {
                        nameToCheck = usefulMedia.legend.toLowerCase();
                        newName = usefulMedia.legend;
                    }
                }
            }

            let matchedTag = null;

            // Attempt match against keywords
            for (const [keyword, tag] of Object.entries(KEYWORD_MAP)) {
                if (nameToCheck.includes(keyword)) {
                    matchedTag = tag;
                    break; // Take first match
                }
            }

            if (matchedTag) {
                // Update Tags
                item.tags = (item.tags || []).filter(t => !t.includes("Unclassified"));
                if (!item.tags.includes(matchedTag)) {
                    item.tags.push(matchedTag);
                }

                // Update Name if it was generic and we found a better one
                if (item.entity_name === "Unclassified" && newName !== "Unclassified") {
                    item.entity_name = newName;
                }

                reclassifiedCount++;
            } else {
                stillUnclassified++;
                // console.log(`Still Unclassified: "${nameToCheck}"`);
            }
        }
    });

    console.log(`Reclassified ${reclassifiedCount} items.`);
    console.log(`Remaining Unclassified: ${stillUnclassified}`);

    fs.writeFileSync(INPUT_FILE, JSON.stringify(data, null, 2));

} catch (e) {
    console.error(e);
}
