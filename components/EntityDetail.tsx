import React, { useState, useMemo, useEffect } from 'react';
import { DiseaseEntity, SectionType, MediaItem } from '../types';
import ImageModal from './ImageModal';
import { ArrowLeft, Microscope, Activity, Dna, FileText, Search, AlertCircle, Eye, X, Maximize2, BookOpen, ExternalLink, PlayCircle, Sparkles, Loader2, Database, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getImageUrl } from '../utils/media';
import { resolveVideoUrl } from '../utils/video';
import { normalizeTag, getEntityTitle } from '../utils/taxonomy';
import { cleanEntityContent } from '../services/geminiService';

interface EntityDetailProps {
  entity: DiseaseEntity;
  onBack: () => void;
}

interface SourceLink {
  title: string;
  url: string;
  type: 'html' | 'pdf' | 'text';
  details?: string;
  citationNumber?: number;
}

const openWSIWindow = (url: string, title?: string) => {
  const width = 1200;
  const height = 900;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  window.open(
    url,
    '_blank',
    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
  );
};

const openVideoWindow = (url: string, timestamp?: number | null) => {
  let videoUrl = url;
  if (timestamp !== undefined && timestamp !== null) {
    // Round to integer as YouTube/browsers can fail with decimals (e.g. 1881.28)
    const roundedTime = Math.floor(timestamp);
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const separator = isYouTube ? (url.includes('?') ? '&' : '?') : '#';
    videoUrl = `${url}${separator}t=${roundedTime}`;
  }

  window.open(videoUrl, '_blank');
};

const getWSISource = (url?: string) => {
  if (!url) return 'Unknown';
  if (url.includes('dpa-dapa.com') || url.includes('pathpresenter.net')) return 'PathPresenter';
  if (url.includes('leeds.ac.uk')) return 'Leeds';
  if (url.includes('mghpathology.org')) return 'MGH';
  if (url.includes('rosai')) return 'Rosai';
  if (url.includes('who.int')) return 'WHO';
  return 'External Source';
};

const EntityDetail: React.FC<EntityDetailProps> = ({ entity, onBack }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'figures' | 'lecture_slides' | 'wsi'>('content');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showAIContent, setShowAIContent] = useState(true);
  const [cleanedEntity, setCleanedEntity] = useState<Partial<DiseaseEntity> | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const processAIContent = async () => {
      setIsCleaning(true);
      try {
        const cleaned = await cleanEntityContent(entity);
        console.log("AI Cleaned Content Applied:", cleaned);
        setCleanedEntity(cleaned);
      } catch (error) {
        console.error("Failed to clean content:", error);
      } finally {
        setIsCleaning(false);
      }
    };

    processAIContent();
  }, [entity]);

  // Map related_figures to MediaItem structure
  const allMedia: MediaItem[] = useMemo(() => {
    const media: MediaItem[] = [];

    if (entity.media) {
      media.push(...entity.media.map(m => ({
        ...m,
        timestamp: m.timestamp ?? (m as any).t
      })));
    }

    if (entity.related_figures) {
      entity.related_figures.forEach(fig => {
        media.push({
          type: fig.isWSI ? 'wsi' : ((fig.timestamp !== null && fig.timestamp !== undefined) ? 'lecture_slide' : 'figure'),
          path: fig.gcs_path?.replace('gs://pathology-hub-0/', '') || undefined,
          url: fig.wsi_link || undefined,
          legend: fig.legend,
          timestamp: fig.timestamp
        });
      });
    }

    return media;
  }, [entity.media, entity.related_figures]);

  // Gallery Navigation (Must be AFTER allMedia definition)
  const galleryItems = useMemo(() => allMedia.filter(m => m.type === 'figure' || m.type === 'lecture_slide'), [allMedia]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedMedia) return;
    const currentIndex = galleryItems.indexOf(selectedMedia);
    if (currentIndex !== -1 && currentIndex < galleryItems.length - 1) {
      setSelectedMedia(galleryItems[currentIndex + 1]);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedMedia) return;
    const currentIndex = galleryItems.indexOf(selectedMedia);
    if (currentIndex > 0) {
      setSelectedMedia(galleryItems[currentIndex - 1]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedMedia) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setSelectedMedia(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMedia, galleryItems]);

  // Helper to fix source URLs: ensure we keep underscores
  const formatSourceUrl = (url: string) => {
    return url;
  };

  const sections: { id: SectionType; label: string; icon: React.ReactNode }[] = [
    { id: 'definition', label: 'Definition', icon: <FileText size={16} /> },
    { id: 'clinical', label: 'Clinical', icon: <Activity size={16} /> },
    { id: 'microscopic', label: 'Microscopic', icon: <Microscope size={16} /> },
    { id: 'pathogenesis', label: 'Pathogenesis', icon: <Dna size={16} /> },
    { id: 'macroscopic', label: 'Macroscopic', icon: <Eye size={16} /> },
    { id: 'ancillary_studies', label: 'IHC / Stains', icon: <Search size={16} /> },
    { id: 'prognosis_and_prediction', label: 'Prognosis', icon: <Activity size={16} /> },
    { id: 'differential_diagnosis', label: 'Differential', icon: <AlertCircle size={16} /> },
  ];

  // ... rest of imports/functions remain same ...

  // Helper to extract sources from markdown content
  const processContent = (content: string, currentSources: SourceLink[]): { processedText: string, newSources: SourceLink[] } => {
    const sourceRegex = /---\s*\[Source:\s*(.*?)\]\s*---/g;
    let match;
    const newSources: SourceLink[] = [];
    let processedText = content;

    const matches: { fullMatch: string, sourceName: string, index: number }[] = [];
    if (content) {
      while ((match = sourceRegex.exec(content)) !== null) {
        matches.push({ fullMatch: match[0], sourceName: match[1], index: match.index });
      }
    }

    let sourceCounter = currentSources.length + 1;
    processedText = content ? content.replace(sourceRegex, (match, sourceName) => {
      const citationNumber = sourceCounter++;
      newSources.push({
        title: sourceName,
        url: "",
        type: 'text',
        details: 'Textbook Content',
        citationNumber: citationNumber
      });
      return ` [${citationNumber}] `;
    }) : "";

    return { processedText, newSources };
  };

  // Helper to process source tags
  const processSourceTags = (text: string, isRaw: boolean = false) => {
    // If raw mode, we just want to ensure [Source: ...] tags are readable but present
    // The user asked to "convert things back to the concatenated raw text that shows sources eg [Elston] capiche?"

    const sourceRegex = /---\s*\[Source:\s*(.*?)\]\s*---/g;

    // Map of raw source names to display names
    const sourceMap: Record<string, string> = {
      'Skin_Elston': 'Elston',
      'Skin_McKee': 'McKee',
      'Skin_Levers': 'Levers',
      'Skin_McKee_High_Yield': 'McKee High Yield',
    };

    let processed = text.replace(sourceRegex, (match, rawSource) => {
      let displayName = '';

      if (sourceMap[rawSource]) {
        displayName = sourceMap[rawSource];
      } else if (rawSource.startsWith('WHO')) {
        displayName = 'WHO';
      } else if (rawSource.includes('Levers')) {
        displayName = 'Levers';
      } else if (rawSource.includes('High_Yield')) {
        displayName = 'McKee High Yield';
      } else if (rawSource.includes('McKee')) {
        displayName = 'McKee';
      } else if (rawSource.includes('Elston')) {
        displayName = 'Elston';
      } else if (rawSource.includes('YT')) {
        displayName = 'Lecture';
      }

      if (displayName) {
        // In RAW mode, we keep the source tag but make it readable e.g. [Elston]
        // In CLEAN mode, we often hide it, but here we are processing the "Content" which might be the AI cleaned one (which has no sources)
        // OR the raw content (which has sources). 
        // If we are viewing raw content, we want [Elston].
        return `\n\n**[${displayName}]**\n`;
      }
      return match; // Keep original if unknown? Or hide? Let's keep for safety in raw mode.
    });

    if (!isRaw) {
      // If NOT raw (meaning we are viewing AI content, or some intermediate state where we don't want intrusive tags),
      // arguably the AI content shouldn't have these tags anyway per prompt. 
      // But if we are falling back to raw content because AI failed, we might still want readable tags.
      // For now, the logic above essentially makes them readable in all cases if they exist.
    }

    // Add timestamp hyperlinking [MM:SS], MM:SS, (Time: 109s), etc.
    const timestampRegex = /(\[?\d{1,2}:\d{2}\]?|\(Time:\s*\d+s?\)|\[Time:\s*\d+s?\])/gi;
    processed = processed.replace(timestampRegex, (match) => {
      let seconds = 0;
      const colonMatch = match.match(/(\d{1,2}):(\d{2})/);
      if (colonMatch) {
        seconds = parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
      } else {
        const secMatch = match.match(/(\d+)/);
        if (secMatch) {
          seconds = parseInt(secMatch[1]);
        }
      }

      const videoBase = entity.gcs_video_path || entity.video;
      // Try to resolve video from entity video fields or fallback if null
      let videoUrl = videoBase;

      if (!videoUrl) {
        // If entity has no direct video, try to find the first lecture slide's path to resolve a base video
        const firstLecture = allMedia.find(m => m.type === 'lecture_slide' || m.path?.includes('/lectures/'));
        if (firstLecture) {
          videoUrl = resolveVideoUrl(firstLecture.path);
        }
      }

      if (videoUrl) {
        if (videoUrl.startsWith('gs://')) {
          videoUrl = videoUrl.replace('gs://', 'https://storage.googleapis.com/');
        }

        // Use correct timestamp separator (?t= for YouTube, #t= for direct video)
        const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
        const separator = isYouTube ? (videoUrl.includes('?') ? '&' : '?') : '#';

        return `[**${match}**](${videoUrl}${separator}t=${seconds})`;
      }

      return `**${match}**`;
    });

    return processed;
  };

  const { sources, processedEntity } = useMemo(() => {
    const uniqueSources: (SourceLink & { citationNumber?: number })[] = [];
    const seenUrls = new Set<string>();
    let citationCounter = 1;

    const addSource = (title: string, url: string, type: 'html' | 'pdf' | 'text', details?: string) => {
      if (url && seenUrls.has(url)) return;
      if (url) seenUrls.add(url);
      uniqueSources.push({
        title,
        url,
        type,
        details,
        citationNumber: citationCounter++
      });
    };

    const htmlUrl = entity.html_gcs_path || entity.html;
    if (htmlUrl) {
      let url = htmlUrl;
      if (!url.startsWith('http') && !url.startsWith('gs://')) {
        url = `https://storage.googleapis.com/pathology-hub-0/${url}`;
      } else if (url.startsWith('gs://')) {
        url = url.replace('gs://', 'https://storage.googleapis.com/');
      }

      addSource('WHO Classification of Tumours', url, 'html', 'Online Reference');
    }

    if (allMedia.length > 0) {
      allMedia.forEach(item => {
        // Try to infer source from path if possible, usually for textbooks in path
        if (item.path && item.path.includes('/textbooks/')) {
          const matchBook = item.path.match(/\/textbooks\/([^\/]+)\//);
          const matchPage = item.path.match(/page_(\d+)/);

          if (matchBook) {
            const rawBookName = matchBook[1];
            // Fix: Map known raw book names to cleaner PDF filenames if needed, or assume identical.
            // Current GCS structure usually matches rawBookName.pdf
            const pdfFileName = rawBookName;
            let pdfUrl = `https://storage.googleapis.com/pathology-hub-0/source_pdfs/${pdfFileName}.pdf`;
            let details = "Textbook Reference";
            if (matchPage) {
              const pageNum = matchPage[1];
              pdfUrl += `#page=${pageNum}`;
              details = `Page ${pageNum}`;
            }
            const displayTitle = rawBookName.replace(/_/g, ' ');
            addSource(displayTitle, pdfUrl, 'pdf', details);
          }
        }

        // Also capture WHO WSI links as references if they exist
        if (item.url && item.url.includes('who.int')) {
          addSource('WHO Classification of Tumours', item.url, 'html', item.legend || 'WSI');
        }
      });
    }

    // Explicit check for WHO URL in entity fields if not caught above
    if (entity.html && (entity.html.includes('http') || entity.html.includes('who.int'))) {
      addSource('WHO Classification of Tumours', entity.html, 'html', 'Main Entry');
    }

    const newEntityContent: Record<string, string> = {};

    sections.forEach(section => {
      // Logic:
      // If showAIContent is true AND cleanedEntity exists: show Cleaned (AI) content.
      // Else: show Raw (Entity) content.

      const useAI = showAIContent && cleanedEntity && (cleanedEntity as any)[section.id];
      const rawContent = entity[section.id];

      const content = useAI ? (cleanedEntity as any)[section.id] : rawContent;

      if (content) {
        // If we are showing Cleaned content, we generally expect the prompt to have handled formatting.
        // If we are showing Raw content, we want to process tags to be readable.
        // We pass !useAI as the 'isRaw' flag (conceptually).
        newEntityContent[section.id] = processSourceTags(content, !useAI);
      }
    });

    return { sources: uniqueSources, processedEntity: newEntityContent };
  }, [entity, cleanedEntity, showAIContent]);

  // Group WSIs by source and type (Gallery vs List)
  const wsiGroups = useMemo(() => {
    const wsiMedia = allMedia.filter(m => m.type === 'wsi');
    const galleryWSIs: MediaItem[] = []; // Leeds, MGH, Rosai (Have thumbnails)
    const pathPresenterList: MediaItem[] = []; // PathPresenter (No thumbnails, use list)

    wsiMedia.forEach(m => {
      const source = getWSISource(m.url);
      if (source === 'PathPresenter') {
        pathPresenterList.push(m);
      } else {
        galleryWSIs.push(m);
      }
    });

    return { galleryWSIs, pathPresenterList };
  }, [allMedia]);

  // Group and condense references with individual links
  const groupedSources = useMemo(() => {
    const groups: Record<string, { title: string; type: string; links: { label: string; url: string }[] }> = {};

    sources.forEach(s => {
      let baseTitle = s.title.replace(/\s+Page\s+\d+.*$/i, '').trim();

      if (!groups[baseTitle]) {
        groups[baseTitle] = { title: baseTitle, type: s.type, links: [] };
      }

      const pageLabel = s.details?.replace(/Page\s+/i, '').trim() || 'Source';
      const exists = groups[baseTitle].links.some(l => l.label === pageLabel);

      if (!exists) {
        groups[baseTitle].links.push({
          label: pageLabel,
          url: s.url
        });
      }
    });

    return Object.values(groups)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(g => ({
        ...g,
        links: g.links.sort((x, y) => {
          const numX = parseInt(x.label);
          const numY = parseInt(y.label);
          if (!isNaN(numX) && !isNaN(numY)) return numX - numY;
          return x.label.localeCompare(y.label);
        })
      }));
  }, [sources]);

  return (
    <div className="flex flex-col h-full bg-white relative">


      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 flex-shrink-0"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-bold truncate text-slate-900">{getEntityTitle(entity)}</h1>
            <div className="flex gap-2 overflow-hidden mt-0.5">
              {(entity.tags || [])
                .filter(t => t)
                .map(t => normalizeTag(t))
                .filter((t, i, arr) => arr.indexOf(t) === i)
                .slice(0, 2)
                .map(tag => (
                  <span key={tag} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 truncate">
                    {tag}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCleaning ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 animate-pulse">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[10px] font-medium uppercase tracking-wider">AI Thinking</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowAIContent(!showAIContent)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showAIContent
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <Sparkles size={14} />
                {showAIContent ? 'AI Cleaned' : 'Raw Content'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-12 bg-white">
          {/* Text Sections */}
          <div className="space-y-12 max-w-5xl mx-auto">
            {sections.map(section => (
              processedEntity[section.id] && (
                <section key={section.id} id={section.id} className="scroll-mt-24 group">
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-xl font-bold text-slate-900">
                      {section.label}
                    </h2>
                    <span className="h-px flex-1 bg-slate-200 group-hover:bg-indigo-200 transition-colors"></span>
                  </div>
                  <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-indigo-600 hover:prose-a:underline">
                    <ReactMarkdown>{processedEntity[section.id]!}</ReactMarkdown>
                  </div>
                </section>
              )
            ))}
          </div>

          {/* Figures Gallery */}
          {allMedia.filter(m => m.type === 'figure' && !m.path?.includes('/lectures/')).length > 0 && (
            <section id="figures" className="pt-8 border-t border-slate-200 scroll-mt-24">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Eye size={20} className="text-indigo-600" />
                Figures & Clinical Images
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {allMedia.filter(m => m.type === 'figure' && !m.path?.includes('/lectures/')).map((media, idx) => (
                  <div
                    key={idx}
                    className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedMedia(media)}
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      {getImageUrl(media.path || media.url || null) ? (
                        <img
                          src={getImageUrl(media.path || media.url || null)!}
                          alt={media.legend || getEntityTitle(entity)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Preview';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                          <Database size={32} />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="px-1.5 py-0.5 bg-slate-800/80 text-white border border-slate-700 rounded text-[9px] font-bold uppercase tracking-wide backdrop-blur-md">
                          Fig
                        </span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <div className="bg-white/90 p-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <Maximize2 size={16} className="text-slate-700" />
                        </div>
                      </div>
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-white flex-1 flex flex-col">
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                        {media.legend || 'No description'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lecture Slides Section */}
          {allMedia.filter(m => m.type === 'lecture_slide' || m.type === 'lecture' || m.path?.includes('/lectures/')).length > 0 && (
            <section id="lecture-slides" className="pt-8 border-t border-slate-200 scroll-mt-24">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <PlayCircle size={20} className="text-amber-600" />
                Lecture Slides
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {allMedia.filter(m => m.type === 'lecture_slide' || m.type === 'lecture' || m.path?.includes('/lectures/')).map((media, idx) => {
                  const formatTime = (seconds: number) => {
                    const m = Math.floor(seconds / 60);
                    const s = Math.floor(seconds % 60);
                    return `${m}:${s.toString().padStart(2, '0')}`;
                  };

                  const thumbUrl = getImageUrl(media.path || null);
                  // Resolve video URL from media path (slide ID) or entity video fields
                  const videoUrl = resolveVideoUrl(media.path) || resolveVideoUrl(entity.gcs_video_path || entity.video);

                  const handleClick = () => {
                    if (videoUrl) {
                      openVideoWindow(videoUrl, media.timestamp ?? 0);
                    } else {
                      setSelectedMedia(media);
                    }
                  };

                  return (
                    <div
                      key={idx}
                      className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={handleClick}
                    >
                      <div className="relative aspect-video overflow-hidden bg-slate-100">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={media.legend || getEntityTitle(entity)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Thumbnail';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                            <Database size={32} />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="px-1.5 py-0.5 bg-amber-500/90 text-white border border-amber-400 rounded text-[9px] font-bold uppercase tracking-wide backdrop-blur-md">
                            {media.timestamp !== undefined && media.timestamp !== null ? formatTime(media.timestamp) : 'Slide'}
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <div className="bg-white/90 p-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                            <PlayCircle size={20} className="text-amber-600" />
                          </div>
                        </div>
                      </div>
                      <div className="p-2 border-t border-slate-100 bg-white flex-1 flex flex-col">
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                          {media.legend || 'No description'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Primary WSI Gallery */}
          {wsiGroups.galleryWSIs.length > 0 && (
            <section id="wsi-gallery" className="pt-8 border-t border-slate-200 scroll-mt-24">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Microscope size={20} className="text-indigo-600" />
                Whole Slide Images
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {wsiGroups.galleryWSIs.map((media, idx) => {
                  const source = getWSISource(media.url);
                  return (
                    <div
                      key={idx}
                      className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => media.url && openWSIWindow(media.url, media.legend)}
                    >
                      <div className="relative aspect-square overflow-hidden bg-slate-100">
                        {getImageUrl(media.path || media.url || null) ? (
                          <img
                            src={getImageUrl(media.path || media.url || null)!}
                            alt={media.legend || getEntityTitle(entity)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=WSI+Thumbnail+Unavailable';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                            <Microscope size={32} />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="px-1.5 py-0.5 bg-indigo-600/90 text-white border border-indigo-500 rounded text-[9px] font-bold uppercase tracking-wide backdrop-blur-md">
                            {source}
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <div className="bg-white/90 p-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                            <Maximize2 size={20} className="text-indigo-600" />
                          </div>
                        </div>
                      </div>
                      <div className="p-2 border-t border-slate-100 bg-white flex-1 flex flex-col">
                        <p className="text-[10px] font-bold text-slate-700 truncate mb-0.5">
                          {media.legend?.replace(/^WSI:\s*/i, '') || 'Slide Viewer'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Additional WSI (PathPresenter List) */}
          {wsiGroups.pathPresenterList.length > 0 && (
            <section id="additional-wsi" className="pt-8 border-t border-slate-200 scroll-mt-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Database size={20} className="text-emerald-600" />
                  Additional WSI & Clinical Media
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {wsiGroups.pathPresenterList.map((media, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 flex items-center justify-between bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-emerald-200 transition-all group cursor-pointer"
                    onClick={() => media.url && openWSIWindow(media.url, media.legend)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate" title={media.legend}>
                          {media.legend?.replace(/^WSI:\s*/i, '') || 'Clinical Slide'}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
                          PathPresenter • Interactive
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={12} className="text-emerald-600" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sources Section */}
          {groupedSources.length > 0 && (
            <section id="sources" className="pt-8 border-t border-slate-200 scroll-mt-24">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" />
                References & Sources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedSources.map((source, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        {source.type === 'pdf' ? <FileText size={16} /> : <BookOpen size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                          {source.title}
                        </p>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                          {source.links.map((link, lidx) => (
                            <a
                              key={lidx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-indigo-100 hover:border-indigo-300 transition-colors shadow-sm"
                            >
                              {link.label.startsWith('Source') ? 'Link' : `Page ${link.label}`}
                              <ExternalLink size={8} />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="h-24"></div>
        </main>
      </div>

      {/* Modal */}
      <ImageModal
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        title={getEntityTitle(entity)}
      />
    </div>
  );
};

// Helper for icon
const ZoomInIcon = ({ isWSI }: { isWSI?: boolean }) => {
  if (isWSI) return <Microscope size={16} />;
  return <Maximize2 size={16} />;
};

export default EntityDetail;