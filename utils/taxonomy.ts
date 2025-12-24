import tagMapping from '../tag_mapping.json';

const TAG_REPLACEMENTS: Record<string, string> = tagMapping;

export const CATEGORY_MAP: Record<string, string> = {
    // === 1. INFECTIOUS ===
    'Infections': 'Infectious',
    'Infectious': 'Infectious', // Self-map to be safe

    // === 2. INFLAMMATORY ===
    'Inflammatory': 'Inflammatory',
    'Inflammatory_Diseases': 'Inflammatory',

    // Patterns
    'Blistering_Disease': 'Inflammatory::Blistering',
    'Blistering_disorders': 'Inflammatory::Blistering',
    'Blisters': 'Inflammatory::Blistering',
    'Granulomatous_&_Histiocytic': 'Inflammatory::Granulomatous',
    'Granulomatous_Disease': 'Inflammatory::Granulomatous',
    'Granulomatous_Histiocytic': 'Inflammatory::Granulomatous',
    'Lichenoid_Interface_Dermatitis': 'Inflammatory::Interface',
    'Lichenoid_Interface_dermatitis': 'Inflammatory::Interface',
    'Interface_Dermatitis': 'Inflammatory::Interface',
    'Psoriasiform_Dermatitis': 'Inflammatory::Psoriasiform',
    'Spongiotic_Dermatitis': 'Inflammatory::Spongiotic',
    'Vacuolar_Interface_Dermatitis': 'Inflammatory::Interface',
    'Vaculitis': 'Inflammatory::Vasculitis',
    'Vasculitis': 'Inflammatory::Vasculitis',
    'Panniculitis': 'Inflammatory::Panniculitis',
    'Perivascular_Dermatitis': 'Inflammatory::Perivascular',
    'Neutrophilic_Dermatoses': 'Inflammatory::Neutrophilic',
    'Eosinophilic_Dermatoses': 'Inflammatory::Eosinophilic',

    // Miscellaneous / Structural mapped to Inflammatory/Other
    'Alopecia': 'Inflammatory::Alopecia', // Mostly inflammatory
    'Follicular_disorders': 'Inflammatory::Adnexal', // Folliculitis etc
    'Follicular_Disorders': 'Inflammatory::Adnexal',
    'Appendageal_Disorder': 'Inflammatory::Adnexal',
    'Appendageal_Disorders': 'Inflammatory::Adnexal',
    'Connective_Tissue': 'Inflammatory::Connective_Tissue', // Lupus, Scleroderma etc
    'Vascular_Disease': 'Inflammatory::Vasculitis_Vascular', // Vasculitis, Occlusive
    'Vascular_Diseases': 'Inflammatory::Vasculitis_Vascular',

    // === 3. CONGENITAL / STRUCTURAL ===
    'Congenital_Structural': 'Congenital_Structural',
    'Genodermatoses': 'Congenital_Structural::Genodermatosis',
    'Genodermatosis': 'Congenital_Structural::Genodermatosis',
    'Syndromes': 'Congenital_Structural::Syndromes',
    'Benign_Cyst': 'Congenital_Structural::Cyst',
    // Note: Cysts can be acquired but structurally fit here better than Neoplastic/Inflammatory for browsing

    // === 4. DEPOSITIONAL / METABOLIC ===
    'Depositional_Metabolic': 'Depositional_Metabolic',
    'Metabolic_&_Depositional': 'Depositional_Metabolic',
    'Metabolic_Depositional': 'Depositional_Metabolic',
    'Metabolic_Disorder': 'Depositional_Metabolic',
    'Metabolic_Disorders': 'Depositional_Metabolic',
    'Collagen_Elastin_and_Radiation': 'Depositional_Metabolic::Collagen_Elastin',
    'Collagen_and_Elastin_Disorder': 'Depositional_Metabolic::Collagen_Elastin',
    'Mast_Cell_Disorders': 'Depositional_Metabolic::Mast_Cell', // Or Neoplastic? Stick to Depositional/Systemic
    'Mast_Cell_Neoplasm': 'Neoplastic::Hematolymphoid::Mast_Cell', // If explicitly neoplasm

    // === 5. NEOPLASTIC ===
    'Neoplastic': 'Neoplastic',

    // Adnexal
    'Adnexal_Neoplasm': 'Neoplastic::Adnexal',
    'Appendageal_Neoplasm': 'Neoplastic::Adnexal',
    'Appendageeal_Neoplasm': 'Neoplastic::Adnexal', // Fix typo in dataset
    'Sweat_gland_tumors': 'Neoplastic::Adnexal',
    'Follicular_Tumor': 'Neoplastic::Adnexal', // If exists

    // Epidermal
    'Epidermal_Neoplasm': 'Neoplastic::Epidermal',
    'Benign_epidermal_neoplasms': 'Neoplastic::Epidermal',
    'Malignant_tumors_of_the_epidermis': 'Neoplastic::Epidermal',
    'Keratinocytic': 'Neoplastic::Epidermal',

    // Melanocytic
    'Melanocytic': 'Neoplastic::Melanocytic',

    // Soft Tissue / Mesenchymal
    'Soft_Tissue': 'Neoplastic::Soft_Tissue',
    'Adipose_Neoplasm': 'Neoplastic::Soft_Tissue::Adipocytic',
    'Vascular_Neoplasm': 'Neoplastic::Soft_Tissue::Vascular',
    'Neural': 'Neoplastic::Soft_Tissue::Neural', // Neural tumors
    'Osseous_Neoplasm': 'Neoplastic::Soft_Tissue::Chondro-Osseous',
    'Cartilaginous_Neoplasm': 'Neoplastic::Soft_Tissue::Chondro-Osseous',
    'Connective_Tissue_Neoplasm': 'Neoplastic::Soft_Tissue',

    // Hematolymphoid
    'Lymphoid_Neoplasm': 'Neoplastic::Hematolymphoid',
    'Lymphoid_Proliferation': 'Neoplastic::Hematolymphoid',
    'Myeloid_Neoplasm': 'Neoplastic::Hematolymphoid',
    'Xanthomatous_Histiocytic_Neoplasm': 'Neoplastic::Hematolymphoid::Histiocytic', // or Soft Tissue? 

    // Other / Edge Cases
    'Appendageal': 'Neoplastic::Adnexal', // Assume neoplasm if unspecified
    'Artifact': 'Congenital_Structural::Artifact', // Structural artifact
    'Miscellaneous': 'Inflammatory::Miscellaneous',
    'Orphan_Tag': 'Inflammatory::Miscellaneous',
    'Other': 'Inflammatory::Miscellaneous',

    // Other
    'Metastatic_Disease': 'Neoplastic::Metastatic',
    'System': 'Neoplastic::Systemic' // Or separate?
};

export const normalizeTag = (tag: string): string => {
    // 1. Check direct replacement map
    if (TAG_REPLACEMENTS[tag]) {
        return TAG_REPLACEMENTS[tag];
    }

    if (!tag.startsWith('Skin::')) return tag;
    const parts = tag.split('::');
    // Check the top-level category (index 1)
    if (parts.length > 1) {
        const topLevel = parts[1];
        if (CATEGORY_MAP[topLevel]) {
            const mapped = CATEGORY_MAP[topLevel];
            const remaining = parts.slice(2).join('::');
            return `Skin::${mapped}${remaining ? '::' + remaining : ''}`;
        }
    }
    return tag;
};
export const getEntityTitle = (entity: { entity_name: string; tags: string[] }): string => {
    if (!entity.tags || entity.tags.length === 0) return entity.entity_name;

    // Use the first tag as primary (usually the most specific/leaf-oriented in this dataset)
    const primaryTag = entity.tags[0];

    // Normalize if it's in the mapping
    const normalized = normalizeTag(primaryTag);

    // Extract the leaf
    const parts = normalized.split('::');
    let leaf = parts[parts.length - 1];

    // If leaf is something like "NOS" or "Overview", try to get the parent if it's more descriptive, 
    // but the user's specific request is "Pascal Case leaf tag".

    // Format the leaf: replace underscores with spaces
    let title = leaf.replace(/_/g, ' ');

    // Special handling for common abbreviations or suffix if needed, 
    // but let's stick to the user's request: Pascal Case leaf.

    return title;
};
