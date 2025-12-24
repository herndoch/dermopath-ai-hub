const YOUTUBE_MAPPINGS: Record<string, string> = {
    'YT_Skin_B_Cell_Lymphoma_Cassarino': 'https://youtube.com/watch?v=D2hVCkpL3gQ',
    'YT_Skin_Vascular_Fung': 'https://www.youtube.com/watch?v=olIAxhxxM9E',
    'YT_Skin_Spongiotic_Dermatitis_Fung': 'https://www.youtube.com/watch?v=bSQpuPVXoVA',
    'YT_Skin_Soft_Tissue_Fung': 'https://www.youtube.com/watch?v=cx8ZXHGL_P0',
    'YT_Skin_Psoriasiform_Dermatitis_Fung': 'https://www.youtube.com/watch?v=kvGg012OgUY',
    'YT_Skin_Perivascular_Dermatitis_Fung': 'https://www.youtube.com/watch?v=ozGdS88hXCE',
    'YT_Skin_Perforating_Fung': 'https://www.youtube.com/watch?v=Sv0uMTnjYEQ',
    'YT_Skin_Blistering_Fung': 'https://www.youtube.com/watch?v=z4P0MiCeBLw',
    'YT_Skin_Melanocytic_Fung': 'https://www.youtube.com/watch?v=RPFGggomgRs',
    'YT_Skin_Interface_Dermatitis_Fung': 'https://www.youtube.com/watch?v=z_MRrM6MSbk',
    'YT_Skin_IHC_Fung': 'https://www.youtube.com/watch?v=j5QJRCZKt0E',
    'YT_Skin_Granulomatous_Dermatitis_Fung': 'https://www.youtube.com/watch?v=KS3dJI3hvAo',
    'YT_Skin_Common_Disorders_Fung': 'https://www.youtube.com/watch?v=Fp0LG4soTAo',
    'YT_Skin_Melanoma_LeBoit': 'https://www.youtube.com/watch?v=xaOTNkwfvHM',
    'YT_Skin_Metabolic_and_Connective_Tissue_Junkins': 'https://www.youtube.com/watch?v=vXtLer5RFzI',
    'YT_Skin_Papulosquamous_and_Spongiotic_Dermatitis_Ko': 'https://www.youtube.com/watch?v=bfQcIFLcFxQ',
    'YT_Skin_T_Cell_Lymphoma_Cassarino': 'https://www.youtube.com/watch?v=vHNMrrMyoq0',
    'YT_Skin_Vacuolar_and_Lichenoid_Interface_Dermatitis_Junkins': 'https://www.youtube.com/watch?v=YrAfg207y9A',
    'YT_Skin_Vasculitis_Johnson': 'https://youtube.com/watch?v=gLcRxI5cZLw',
    'YT_Skin_WHO_Classification_Scoyler': 'https://www.youtube.com/watch?v=91cY2JEdrTg'
};

/**
 * Resolves a video identifier (e.g. YT_Skin_Blistering_Fung) to a YouTube URL or GCS fallback.
 */
export const resolveVideoUrl = (identifier: string | null | undefined): string | null => {
    if (!identifier) return null;

    // Normalize identifier: remove .mp4, remove path prefix if any
    let cleanId = identifier.replace('.mp4', '');
    if (cleanId.includes('/')) {
        const parts = cleanId.split('/');
        cleanId = parts[parts.length - 1];
    }

    // Also handle identifiers like "YT_Skin_Blistering_Fung_slide_0068"
    // Extract the base lecture name if it contains "_slide_"
    const slideMatch = cleanId.match(/^(YT_.*?|Derm_Lecture_.*?)_slide_/);
    if (slideMatch) {
        cleanId = slideMatch[1];
    }

    // 1. Check YouTube Mapping
    if (YOUTUBE_MAPPINGS[cleanId]) {
        return YOUTUBE_MAPPINGS[cleanId];
    }

    // 2. Fallback to GCS source_videos
    return `https://storage.googleapis.com/pathology-hub-0/source_videos/${cleanId}.mp4`;
};
