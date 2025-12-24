import React, { useState, useMemo } from 'react';
import { Search, Info, ArrowRight, Database, Microscope, PlayCircle, Play, Sparkles, Loader2, Bot, AlertCircle } from 'lucide-react';
// diseaseData import removed to prevent bundling
import { DiseaseEntity, MediaItem } from './types';
import EntityDetail from './components/EntityDetail';
import ErrorBoundary from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { getImageUrl } from './utils/media';
import { normalizeTag, getEntityTitle } from './utils/taxonomy';
import { parseSearchQuery, generateAnswer } from './services/geminiService';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<DiseaseEntity | null>(null);
  const [entities, setEntities] = useState<DiseaseEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  // AI Search State
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiMedia, setAiMedia] = useState<MediaItem[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<{ target_entity_name: string | null; keywords: string[]; target_section: string | null } | null>(null);

  React.useEffect(() => {
    console.log("DermPath Hub v3.3 - Production Build (Dynamic Data Fetching)");

    fetch('Skin_Global_Leaf_Optimized.json')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load data");
        return res.json();
      })
      .then(data => {
        setEntities(data as DiseaseEntity[]);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Data load error:", err);
        setLoadingError(err.message);
        setIsLoading(false);
      });
  }, []);

  // Deep Linking Logic
  React.useEffect(() => {
    if (entities.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const tagParam = params.get('tag');

    if (tagParam) {
      console.log(`Attempting deep link for tag: ${tagParam}`);

      // Robust matching:
      // 1. Normalize param: lowercase, spaces -> underscores
      const normalizedParam = tagParam.toLowerCase().trim().replace(/ /g, '_');

      const target = entities.find(e => {
        if (!e.tags) return false;
        return e.tags.some(tag => {
          const normalizedTag = tag.toLowerCase();
          // Check for exact match of full tag matches (case-insensitive)
          if (normalizedTag === normalizedParam) return true;
          // Check if tag ends with the param (e.g. Skin::...::Target matches Target)
          if (normalizedTag.endsWith(`::${normalizedParam}`)) return true;
          // Check if tag ends with param where param has spaces but tag has underscores
          // (Already handled by normalizing param to underscores above)
          return false;
        });
      });

      if (target) {
        console.log(`Found entity for deep link: ${target.entity_name}`);
        setSelectedEntity(target);
      } else {
        console.warn(`No entity found for tag: ${tagParam} (normalized: ${normalizedParam})`);
      }
    }
  }, [entities]);

  // const entities = diseaseData; // replaced by state
  const itemsPerPage = 20;

  // Advanced Search & Ranking Logic
  const filteredData = useMemo(() => {
    let data = entities;

    // 1. Filter by Category if selected
    if (selectedCategory) {
      data = data.filter(item => {
        if (!item || !item.tags) return false;
        return item.tags.some(t => {
          if (!t) return false;
          return normalizeTag(t).includes(`Skin::${selectedCategory}`);
        });
      });
    }

    // 2. Determine Search Terms (User Input vs AI Analysis)
    const effectiveQuery = aiAnalysis?.target_entity_name || searchQuery;
    if (!effectiveQuery && (!aiAnalysis?.keywords || aiAnalysis.keywords.length === 0)) return data;

    const lowerQuery = effectiveQuery.toLowerCase();
    const keywords = aiAnalysis?.keywords.map(k => k.toLowerCase()) || [];

    // 3. Score & Filter Items
    const scoredData = data.map(item => {
      let score = 0;
      if (!item) return { item, score: -1 };

      const name = (item.entity_name || '').toLowerCase();
      const title = getEntityTitle(item).toLowerCase();
      const tags = (item.tags || []).map(t => t.toLowerCase());
      const content = (item.definition || '' + item.microscopic || '').toLowerCase();

      // Scoring Rules
      if (name === lowerQuery) score += 100; // Exact match
      else if (name.startsWith(lowerQuery)) score += 80; // Starts with
      else if (name.includes(lowerQuery)) score += 60; // Contains
      else if (title.includes(lowerQuery)) score += 50; // Title contains

      // AI Analysis Match (if available) - Boost items matching target entity heavily
      if (aiAnalysis?.target_entity_name) {
        if (name.includes(aiAnalysis.target_entity_name.toLowerCase())) score += 70;
      }

      // Keyword Matches (from AI or User)
      keywords.forEach(kw => {
        if (name.includes(kw)) score += 30;
        else if (tags.some(t => t.includes(kw))) score += 15;
        else if (content.includes(kw)) score += 5;
      });

      // Fallback: If no AI analysis, use simple content match for user query
      if (!aiAnalysis) {
        if (tags.some(t => t.includes(lowerQuery))) score += 20;
        else if (content.includes(lowerQuery)) score += 10;
      }

      return { item, score };
    });

    // 4. Return Sorted Results (> 0 score)
    return scoredData
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

  }, [searchQuery, selectedCategory, entities, aiAnalysis]);

  // Reset to page 1 and clear AI results (except when explicitly running AI search)
  React.useEffect(() => {
    setCurrentPage(1);
    // Only clear AI answers if the query drastically changes or user types? 
    // Actually, keeping AI answer visible while refining query might be nice, 
    // but for consistency, let's clear if user types new text.
    if (searchQuery && !isAISearching) {
      // Debounce clearing to avoid flickering? No, immediate is fine for now.
      // We DO NOT clear here because handleAISearch sets searchQuery too? No, it uses it.
    }
  }, [searchQuery, selectedCategory, aiAnalysis]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;

    setIsAISearching(true);
    setAiAnswer(null);
    setAiMedia([]);
    setAiAnalysis(null); // Reset previous analysis

    try {
      // 1. Analyze Query
      const analysis = await parseSearchQuery(searchQuery);
      console.log("AI Analysis:", analysis);
      setAiAnalysis(analysis); // <--- Triggers filteredData update to show relevant pages!

      // 2. Find relevant entity logic (Same as before, but using the analysis we just set)
      // ... (Re-using logic from previously modified block, but now context-aware)

      let targetEntity: DiseaseEntity | undefined;

      if (analysis.target_entity_name) {
        const lowerTarget = analysis.target_entity_name.toLowerCase();
        targetEntity = entities.find(e =>
          e.entity_name.toLowerCase() === lowerTarget ||
          e.entity_name.toLowerCase().includes(lowerTarget)
        );
      }

      if (!targetEntity && filteredData.length > 0) {
        targetEntity = filteredData[0];
      }

      // Rest of logic is largely handled by the previous update, but we need to ensure
      // we don't accidentally break the 'matchingEntities' logic we added.
      // Actually, since we are replacing the *surrounding* code, we need to preserve the 
      // media aggregation logic we added in the previous turn.

      // -> Re-inserting the Media Aggregation Logic Here <-

      const matchingEntities = analysis.target_entity_name
        ? entities.filter(e =>
          e.entity_name.toLowerCase().includes(analysis.target_entity_name!.toLowerCase())
        )
        : (targetEntity ? [targetEntity] : []); // Fallback

      let context = "";

      if (targetEntity) {
        if (analysis.target_section && (targetEntity as any)[analysis.target_section]) {
          context = `${analysis.target_section.toUpperCase()}: ${(targetEntity as any)[analysis.target_section]}`;
        } else {
          context = `
             Entity: ${targetEntity.entity_name}
             Definition: ${targetEntity.definition || ''}
             Microscopic: ${targetEntity.microscopic || ''}
             Clinical: ${targetEntity.clinical || ''}
             IHC/Ancillary: ${targetEntity.ancillary_studies || ''}
           `;
        }
      } else if (matchingEntities.length > 0) {
        context = `Found ${matchingEntities.length} related entities for "${analysis.target_entity_name}". Summary of first match (${matchingEntities[0].entity_name}): ${matchingEntities[0].definition}`;
      } else {
        // Fallback Context if nothing found in DB but asking AI
        context = "User is asking about a topic not strictly found in the database. Use general knowledge.";
      }

      // Aggregate Media
      const allAggregatedMedia: MediaItem[] = [];
      const sourcesToUse = matchingEntities.length > 0 ? matchingEntities : (targetEntity ? [targetEntity] : []);

      sourcesToUse.forEach(e => {
        if (e.related_figures) {
          e.related_figures.forEach(f => {
            allAggregatedMedia.push({
              type: f.isWSI ? 'wsi' : (f.timestamp ? 'lecture_slide' : 'figure'),
              path: f.gcs_path?.replace('gs://pathology-hub-0/', '') || undefined,
              url: f.wsi_link || undefined,
              legend: f.legend || e.entity_name,
              timestamp: f.timestamp
            } as MediaItem);
          });
        }
      });

      // Filter Aggregated Media
      let relevantMedia: MediaItem[] = [];
      const hasHistology = analysis.target_section === 'microscopic' || analysis.keywords.some(k => k.includes('histology') || k.includes('micro') || k.includes('h&e'));
      const hasClinical = analysis.target_section === 'clinical' || analysis.keywords.some(k => k.includes('clinic'));
      const hasLecture = analysis.keywords.some(k => k.includes('lecture') || k.includes('slide') || k.includes('presentation'));

      if (hasLecture) {
        relevantMedia = allAggregatedMedia.filter(m => m.type === 'lecture_slide');
        if (relevantMedia.length === 0 && analysis.keywords.some(k => k.includes('slide'))) {
          relevantMedia = allAggregatedMedia.filter(m => m.type === 'wsi');
        }
      } else if (hasHistology) {
        relevantMedia = allAggregatedMedia.filter(m => m.type === 'wsi' || (m.legend && (m.legend.toLowerCase().includes('h&e') || m.legend.toLowerCase().includes('micro'))));
      } else if (hasClinical) {
        relevantMedia = allAggregatedMedia.filter(m => m.type === 'figure' && m.legend && m.legend.toLowerCase().includes('clinical'));
      }

      if (relevantMedia.length < 4) {
        const remaining = allAggregatedMedia.filter(m => !relevantMedia.includes(m));
        relevantMedia.push(...remaining.slice(0, 4 - relevantMedia.length));
      }

      relevantMedia = relevantMedia.filter((v, i, a) => a.findIndex(t => (t.path === v.path && t.url === v.url)) === i).slice(0, 8);

      setAiMedia(relevantMedia);

      // 5. Generate Answer
      const answer = await generateAnswer(context, searchQuery);
      setAiAnswer(answer);

    } catch (error) {
      console.error("AI Search Failed:", error);
      setAiAnswer("Sorry, I encountered an error while processing your request.");
    } finally {
      setIsAISearching(false);
    }
  };

  console.log('App rendering with filtered data count:', filteredData.length);

  const handleAIMediaClick = (item: MediaItem) => {
    // Find the entity it belongs to (a bit hacky, but sufficient for this context since we just have the item)
    // Actually, simplest is to just open it in a basic view or rely on user navigating to entity.
    // But for better UX, let's just open the image in a new tab for now, or ideally trigger the modal.
    // Since EntityDetail isn't mounted, we can't easily trigger its modal. 
    // Let's just let the user click the entity to see full details.
    if (selectedEntity) return;
    // We can set the selected entity to the targetEntity found in search if we tracked it in state, 
    // but 'handleAISearch' scope is closed. 
    // Improving this: We will just display the image clearly.
    if (item.url) window.open(item.url, '_blank');
    else if (item.path) {
      const url = getImageUrl(item.path);
      if (url) window.open(url, '_blank');
    }
  };


  // Early return AFTER all hooks
  if (selectedEntity) {
    return (
      <ErrorBoundary>
        <EntityDetail entity={selectedEntity} onBack={() => setSelectedEntity(null)} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar
        entities={entities}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Hero Header */}
        <header className="bg-white border-b border-slate-200 pb-8 pt-12 px-6 shadow-sm flex-shrink-0">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight">
              DermPath-<span className="text-indigo-600">Hub</span>
            </h1>
            <p className="text-slate-500 text-lg mb-8 max-w-2xl mx-auto">
              Intelligent search and analysis for dermatopathologists.
              Access whole slide images, differential diagnoses, and AI-assisted insights.
            </p>

            <div className="relative max-w-2xl mx-auto group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-24 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
                placeholder="Search diagnoses, microscopic features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
              />
              <button
                onClick={handleAISearch}
                disabled={isAISearching || !searchQuery}
                className="absolute inset-y-1 right-1 flex items-center px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isAISearching ? <Loader2 className="animate-spin h-4 w-4" /> : <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Ask AI</span>}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {/* AI Answer Card */}
          {aiAnswer && (
            <div className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                  <Bot className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-indigo-900 mb-2">AI Assistant</h3>
                  <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap mb-4">{aiAnswer}</p>

                  {/* Reference Images */}
                  {aiMedia.length > 0 && (
                    <div className="mt-4 border-t border-indigo-200/50 pt-4">
                      <h4 className="text-xs font-semibold text-indigo-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Microscope className="h-3 w-3" /> Reference Images
                      </h4>
                      <div className="grid grid-cols-4 gap-3">
                        {aiMedia.map((m, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleAIMediaClick(m)}
                            className="group relative aspect-square bg-white rounded-lg overflow-hidden border border-indigo-100 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                          >
                            <img
                              src={getImageUrl(m.path) || 'https://placehold.co/200x200?text=No+Preview'}
                              alt={m.legend || 'Reference'}
                              className="w-full h-full object-cover"
                            />
                            {m.type === 'wsi' && (
                              <div className="absolute top-1 right-1 bg-indigo-600/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">
                                WSI
                              </div>
                            )}
                            {m.type === 'lecture_slide' && (
                              <div className="absolute top-1 right-1 bg-rose-600/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm flex items-center gap-1">
                                <PlayCircle size={8} /> Slide
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 size={48} className="animate-spin mb-4 text-indigo-500" />
              <p className="font-medium text-slate-600">Loading Knowledge Base...</p>
              <p className="text-xs mt-2">Fetching 7MB dataset</p>
            </div>
          ) : loadingError ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <AlertCircle size={48} className="mb-4" />
              <p className="font-medium">Failed to load data</p>
              <p className="text-sm">{loadingError}</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm">Try using "Ask AI" for a deeper analysis</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto pb-12">
              <div className="flex items-center justify-between mb-6">
                <p className="text-slate-500 text-sm font-medium">
                  Showing <span className="text-slate-900 font-bold">{filteredData.length}</span> results
                </p>
                {totalPages > 1 && (
                  <p className="text-slate-400 text-xs">
                    Page {currentPage} of {totalPages}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {paginatedData.map((item, index) => {
                  // Unified media list for preview
                  const media: MediaItem[] = [
                    ...(item.media || []).map(m => ({
                      ...m,
                      timestamp: m.timestamp ?? (m as any).t
                    })),
                    ...(item.related_figures || []).map(fig => ({
                      type: fig.isWSI ? 'wsi' : (fig.timestamp !== null ? 'lecture_slide' : 'figure') as any,
                      path: fig.gcs_path?.replace('gs://pathology-hub-0/', '') || undefined,
                      url: fig.wsi_link || undefined,
                      legend: fig.legend || undefined,
                      timestamp: fig.timestamp
                    }))
                  ];

                  const wsiCount = media.filter(m => m.type === 'wsi').length;
                  const slideCount = media.filter(m => m.type === 'lecture_slide' || m.type === 'lecture').length;
                  const figureCount = media.filter(m => m.type === 'figure').length;
                  const videoCount = media.filter(m => m.type === 'video').length;

                  // Top level video?
                  const hasVideo = !!item.gcs_video_path || !!item.video || videoCount > 0;
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedEntity(item)}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left group flex flex-col h-full overflow-hidden"
                    >
                      <div className="p-5 pb-3">
                        <div className="flex justify-between items-start w-full mb-2">
                          <h3 className="text-lg font-serif font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {getEntityTitle(item)}
                          </h3>
                          {wsiCount > 0 && (
                            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                              WSI
                            </span>
                          )}
                        </div>

                        {/* Media Summary Info */}
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {wsiCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Microscope size={12} className="text-indigo-500" />
                              <span>{wsiCount} WSI</span>
                            </div>
                          )}
                          {figureCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Database size={12} className="text-blue-500" />
                              <span>{figureCount} Figs</span>
                            </div>
                          )}
                          {(slideCount + videoCount) > 0 && (
                            <div className="flex items-center gap-1.5">
                              <PlayCircle size={12} className="text-amber-500" />
                              <span>{slideCount + videoCount} Lecture Slides</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Visual Preview Section (Top 3) */}
                      <div className="px-5 pb-4">
                        <div className="grid grid-cols-3 gap-2 w-full">
                          {(() => {
                            const previewMedia = media.filter(m =>
                              m.type !== 'wsi' || getImageUrl(m.path || null) !== null
                            ).slice(0, 3);

                            if (previewMedia.length === 0) {
                              return (
                                <div className="col-span-3 bg-slate-50 rounded-lg p-3 text-xs text-slate-400 italic h-20 flex items-center justify-center border border-slate-100 border-dashed">
                                  No preview images available
                                </div>
                              );
                            }

                            return (
                              <>
                                {previewMedia.map((m, i) => {
                                  const thumbUrl = getImageUrl(m.path || m.url || null);
                                  return (
                                    <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-100 relative group/img">
                                      {thumbUrl ? (
                                        <img
                                          src={thumbUrl}
                                          alt={m.legend || m.type}
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                          loading="lazy"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Error';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                          {m.type === 'wsi' ? <Microscope size={16} /> : <Database size={16} />}
                                        </div>
                                      )}
                                      {m.type === 'lecture_slide' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                          <Play size={12} className="text-white drop-shadow-sm" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {/* Placeholders if < 3 */}
                                {previewMedia.length < 3 && Array.from({ length: 3 - previewMedia.length }).map((_, i) => (
                                  <div key={`empty-${i}`} className="aspect-[4/3] rounded-lg bg-slate-50 border border-slate-100 border-dashed"></div>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Footer Metadata */}
                      <div className="mt-auto px-5 py-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 bg-slate-50/50 w-full group-hover:bg-indigo-50/30 transition-colors">
                        <span className="flex items-center font-medium text-indigo-600">
                          <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center mt-8 gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-slate-600 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

            </div>
          )}
        </main>

        <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-400 text-sm flex-shrink-0">
          <p>&copy; {new Date().getFullYear()} DermoPath AI. Educational use only.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;