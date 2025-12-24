export interface MediaItem {
    type: 'figure' | 'wsi' | 'video' | 'lecture_slide' | 'lecture';
    path?: string; // For figures, videos, and WSI thumbnails (relative or gcs)
    url?: string;  // For WSI
    legend?: string | null;
    timestamp?: number | null;
}

export interface FigureItem {
    legend: string | null;
    diagnosis: string | null;
    gcs_path: string | null;
    wsi_link: string | null;
    isWSI: boolean;
    timestamp: number | null;
}

export interface DiseaseEntity {
    entity_name: string;
    tags: string[];
    media?: MediaItem[];
    related_figures?: FigureItem[];
    html?: string | null;
    video?: string | null;
    html_gcs_path?: string | null;
    gcs_video_path?: string | null;
    definition: string | null;
    clinical: string | null;
    pathogenesis: string | null;
    macroscopic: string | null;
    microscopic: string | null;
    prognosis_and_prediction: string | null;
    ancillary_studies: string | null;
    differential_diagnosis: string | null;
    [key: string]: any; // Allow indexing
}

export type SectionType =
    | 'definition'
    | 'clinical'
    | 'pathogenesis'
    | 'macroscopic'
    | 'microscopic'
    | 'prognosis_and_prediction'
    | 'ancillary_studies'
    | 'differential_diagnosis';