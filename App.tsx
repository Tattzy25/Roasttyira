/**
 * Main Application Component for Lyria Studio
 * 
 * This component serves as the primary container for the Lyria Studio application.
 * It manages the global state for music generation, including user inputs (prompts,
 * duration, lyrics options, image uploads), the generation process, and the display
 * of generated results.
 * 
 * Key Features:
 * - Prompt building (manual or via the PromptBuilder helper)
 * - Image upload for visual prompting
 * - Integration with Google GenAI for audio generation
 * - Audio playback and video export functionality
 * - Display of generated lyrics and metadata (title, cover art)
 */
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "./genaiProxy";
import { Duration, LyricsOption, GenerationState, SongResult } from './types';
import { Icons, PROMPT_HELPER_CONFIG } from './constants';
import { CONFIG } from './src/config';
import { createAudioUrlFromBase64 } from './src/utils/audioUtils';
import { cleanLyricsForDisplay } from './src/utils/lyricsUtils';
import { handleDownloadVideo } from './src/utils/videoUtils';
import { parseModelOutput, generateSongTitle, generateCoverArt } from './src/services/genaiService';
import { getRandomItem } from './src/utils/helpers';
import { PromptBuilder, HelperSection } from './src/components/PromptBuilder';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isPromptManual, setIsPromptManual] = useState(false);
  const [duration, setDuration] = useState<Duration>('Lyria 3.5');
  const [lyricsOption, setLyricsOption] = useState<LyricsOption>('Auto');
  const [customLyrics, setCustomLyrics] = useState('');
  const [gen, setGen] = useState<GenerationState>({ results: [] });
  const [isResultPlaying, setIsResultPlaying] = useState<string | null>(null);
  const [encodingVideoId, setEncodingVideoId] = useState<string | null>(null);
  const [encodingProgress, setEncodingProgress] = useState(0);
  const [selectedImages, setSelectedImages] = useState<{data: string, mimeType: string, previewUrl: string}[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [placeholderVideoFailed, setPlaceholderVideoFailed] = useState(false);

  // Helper Mode States
  const [helperSections, setHelperSections] = useState<HelperSection[]>(() => [
    { 
      id: 'initial', 
      type: 'main', 
      mood: getRandomItem(PROMPT_HELPER_CONFIG.moods), 
      gender: getRandomItem(PROMPT_HELPER_CONFIG.genders), 
      theme: getRandomItem(PROMPT_HELPER_CONFIG.themes) 
    }
  ]);
  const [activeSelector, setActiveSelector] = useState<{ sectionId: string, type: 'mood' | 'gender' | 'theme' | 'timestamp' | 'bpm' | 'scale' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = 'auto';
      promptTextareaRef.current.style.height = `${promptTextareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  // Sync Helper sections to Prompt
  useEffect(() => {
    const generated = helperSections.map(s => {
      const scaleInfo = s.scale ? ` in the scale of ${s.scale.toLowerCase()}` : '';

      if (s.type === 'main') {
        const bpmInfo = s.bpm ? ` at ${s.bpm.toLowerCase()}` : '';
        const musicDetails = `${bpmInfo}${scaleInfo}`;
        return `Create a ${s.mood?.toLowerCase()} ${s.gender?.toLowerCase()} song about ${s.theme?.toLowerCase()}${musicDetails}.`;
      } else {
        const musicDetails = `${scaleInfo}`;
        return `[From ${s.timestamp}] the song transitions to a ${s.mood?.toLowerCase()} ${s.gender?.toLowerCase()} song${musicDetails}.`;
      }
    }).join('\n');
    setPrompt(generated);
    setIsPromptManual(false); // Helper sync is not "manual typing"
  }, [helperSections]);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Limit to 10 images total
    const remainingSlots = 10 - selectedImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setSelectedImages(prev => [...prev, { data: base64, mimeType: file.type, previewUrl: URL.createObjectURL(file) }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].previewUrl);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleFeelingLucky = () => {
    // Check if the prompt is manual and not empty. If so, do nothing.
    if (isPromptManual && prompt.trim() !== '') return;

    const randomMood = getRandomItem(PROMPT_HELPER_CONFIG.moods);
    const randomGender = getRandomItem(PROMPT_HELPER_CONFIG.genders);
    const randomTheme = getRandomItem(PROMPT_HELPER_CONFIG.themes);
    
    setHelperSections(prev => prev.map(s => s.type === 'main' ? { ...s, mood: randomMood, gender: randomGender, theme: randomTheme } : s));
  };

  const updateHelperSection = (id: string, updates: Partial<HelperSection>) => {
    setHelperSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateResult = (id: string, updater: (prev: SongResult) => SongResult) => {
    setGen(prev => ({ results: prev.results.map(r => r.id === id ? updater(r) : r) }));
  };

  const toggleExpand = (id: string) => {
    setGen(prev => ({ results: prev.results.map(r => r.id === id ? { ...r, isExpanded: !r.isExpanded } : r) }));
  };

  const handleGenerateSongTitle = async (id: string, musicPrompt: string, lyricContext: string) => {
    const title = await generateSongTitle(musicPrompt, lyricContext);
    updateResult(id, r => ({ ...r, title }));
    return title;
  };

  const handleGenerateCoverArt = async (id: string, musicPrompt: string, lyricContext: string, title?: string) => {
    const base64Image = await generateCoverArt(musicPrompt, lyricContext, title);
    if (base64Image) {
      updateResult(id, r => ({ ...r, coverImageUrl: base64Image }));
    }
  };

  const handleGenerate = async (overrides?: { prompt: string, duration: Duration, lyricsOption: LyricsOption, customLyrics?: string }) => {
    const activePrompt = overrides?.prompt ?? prompt;
    const activeDuration = overrides?.duration ?? duration;
    const activeLyricsOption = overrides?.lyricsOption ?? lyricsOption;
    const activeCustomLyrics = overrides?.customLyrics ?? customLyrics;
    if (!activePrompt.trim() && selectedImages.length === 0) return;

    // Check for API key
    if (false) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        if ((window as any).aistudio?.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
        }
        return; // Stop generation so the user can select the key and try again
      }
    }

    setIsTriggering(true);
    setTimeout(() => setIsTriggering(false), 200);

    const newId = Math.random().toString(36).substring(7);
    const newResult: SongResult = {
      id: newId, status: 'generating', logs: [], audioUrl: null, coverImageUrl: null, title: null, lyrics: '', metadata: '', fullPrompt: null, error: null, duration: activeDuration, timestamp: new Date(), isExpanded: true,
      originalPrompt: activePrompt, originalDuration: activeDuration, originalLyricsOption: activeLyricsOption
    };
    setGen(prev => ({ results: [newResult, ...prev.results.map(r => ({ ...r, isExpanded: false }))] }));
    const isClip = activeDuration === 'Lyria 3 Clip (30s)' || activeDuration === 'Clip (30s)';
    const isPro = activeDuration === 'Lyria 3 Pro' || activeDuration === 'Pro';
    const modelId = isClip ? CONFIG.MODEL_ID_3_CLIP : isPro ? CONFIG.MODEL_ID_3_PRO : CONFIG.MODEL_ID_3_5;
    try {
      const ai = new GoogleGenAI({ apiKey: "server-side" });
      let lyricInstruction = activeLyricsOption === 'Instrumental' ? "IMPORTANT: This track MUST be strictly INSTRUMENTAL." : 
                          activeLyricsOption === 'Custom' ? `\nUse these exact lyrics:\n ${activeCustomLyrics}` : (isClip ? "\nGenerate lyrics with precise [seconds:] timing markers." : "\nGenerate complete lyrics for the track.");
      const contextPart = activePrompt.trim() ? `\nContext: "${activePrompt}".` : '';
      const promptText = `Generate a ${isClip ? '30-second' : 'full-length'} track.${contextPart} ${ lyricInstruction }.`;
      
      // Save the full prompt for display later
      updateResult(newId, r => ({ ...r, fullPrompt: promptText }));
      
      const contents: any = selectedImages.length > 0 ? { 
        parts: [
          { text: promptText }, 
          ...selectedImages.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } }))
        ] 
      } : promptText;
      const responseStream = await ai.models.generateContentStream({ model: modelId, contents: contents, config: { responseModalities: [Modality.AUDIO] } });
      let audioAccumulator = ""; let textAccumulator = ""; let mimeType = "audio/wav"; let auxTriggered = false;
      let currentPartType = ''; let textPartsSeen = 0;
      
      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) { 
            currentPartType = 'audio';
            if (!audioAccumulator && part.inlineData.mimeType) mimeType = part.inlineData.mimeType; 
            audioAccumulator += part.inlineData.data; 
          }
          if (part.text) {
            if (currentPartType !== 'text') { 
              textPartsSeen++; 
              currentPartType = 'text'; 
            }
            if (textPartsSeen === 1) {
              textAccumulator += part.text;
              const { lyrics, metadata } = parseModelOutput(textAccumulator);
              updateResult(newId, r => ({ ...r, lyrics, metadata }));
              if (!auxTriggered && textAccumulator.length > 50) { auxTriggered = true; handleGenerateSongTitle(newId, activePrompt, textAccumulator).then(t => handleGenerateCoverArt(newId, activePrompt, textAccumulator, t)); }
            }
          }
        }
      }
      if (audioAccumulator) { updateResult(newId, r => ({ ...r, status: 'completed', audioUrl: createAudioUrlFromBase64(audioAccumulator, mimeType) })); }
      else throw new Error("Zero audio bits captured.");
    } catch (err: any) { updateResult(newId, r => ({ ...r, status: 'error', error: err.message || "Synthesis interrupted." })); }
  };

  const handleDownload = (result: SongResult) => {
    if (!result.audioUrl) return;
    const link = document.createElement('a'); link.href = result.audioUrl; link.download = `${result.title || 'Lyria'}.wav`; link.click();
  };

  const onDownloadVideo = async (result: SongResult, withLyrics: boolean = false) => {
    if (!result.audioUrl || encodingVideoId) return;
    setEncodingVideoId(result.id);
    setEncodingProgress(0);

    await handleDownloadVideo(
      { ...result, coverImageUrl: result.coverImageUrl || "https://model.tattty.com/BEATZ-LOGO.png" },
      withLyrics,
      (progress) => setEncodingProgress(progress),
      () => {
        setEncodingVideoId(null);
        setEncodingProgress(0);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleGenerate(); };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#000000]" onClick={() => setActiveSelector(null)}>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-12 bg-[#000000]">
        <section className="mb-[75px] relative z-40">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-start pl-1">
                <span className="font-['Dancing_Script',cursive] text-[18px] text-[#ffffff] font-normal leading-none">
                  Powered by
                </span>
                <span className="px-2.5 py-0.5 bg-[#c1ff72] text-[#000000] rounded-md text-[15px] sm:text-[18px] font-bold uppercase tracking-wider leading-tight">
                  {(duration === 'Lyria 3 Clip (30s)' || duration === 'Clip (30s)') ? 'LYRIA 3 30S' : (duration === 'Lyria 3 Pro' || duration === 'Pro') ? 'LYRIA 3 PRO' : 'LYRIA 3.5'}
                </span>
              </div>
              <div className="relative group/prompt min-h-[160px] space-y-4 bg-[#000000] text-[#ffffff]">
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                <div className="w-full bg-[#000000] text-[#ffffff] border border-white/40 hover:border-[#ffffff] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_0_20px_rgba(193,255,114,0.35)] focus-within:border-[#ffffff] focus-within:shadow-[inset_0_0_0_1px_#ffffff,0_0_26px_rgba(193,255,114,0.5)] rounded-3xl transition-all duration-200">
                  <textarea
                    ref={promptTextareaRef}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setIsPromptManual(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Atmospheric cinematic track with heavy sub-bass..."
                    className="prompt-inner-textarea w-full min-h-[96px] bg-transparent text-[#ffffff] placeholder:text-white/40 rounded-t-3xl px-5 sm:px-6 pt-5 sm:pt-6 pb-2 text-lg sm:text-xl font-light leading-relaxed resize-none border-0"
                    style={{ overflow: 'hidden' }}
                  />
                  <div className="flex items-center justify-end px-4 pb-4 pt-1">
                    <button
                      title="Help Me, I'm Boring"
                      onClick={handleFeelingLucky}
                      className={`p-[2px] music-gradient rounded-full shadow-lg shadow-[#c1ff72]/20 hover:brightness-110 transition-transform duration-150 active:scale-95 whitespace-nowrap shrink-0 ${isPromptManual && prompt.trim() !== '' ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
                    >
                      <span className="flex items-center justify-center min-h-[42px] px-5 py-2 rounded-full bg-[#000000] border border-[#000000] text-[#ffffff] text-[15px] sm:text-base font-bold whitespace-nowrap">
                        Help Me, I'm Boring
                      </span>
                    </button>
                  </div>
                </div>
                <PromptBuilder
                  helperSections={helperSections}
                  setHelperSections={setHelperSections}
                  activeSelector={activeSelector}
                  setActiveSelector={setActiveSelector}
                  selectedImages={selectedImages}
                  onImageSelect={() => fileInputRef.current?.click()}
                  onImageRemove={removeImage}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[16px] font-bold uppercase tracking-widest text-gray-400 ml-1">Lyrics</label>
              <div className="flex flex-wrap gap-1.5 bg-[#000000] border border-white/30 hover:border-white/60 transition-colors p-1.5 rounded-2xl w-full sm:w-fit">
                {(['Auto', 'Custom', 'Instrumental'] as LyricsOption[]).map((opt) => {
                  const isSelected = lyricsOption === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setLyricsOption(opt)}
                      className={`flex-1 sm:flex-initial p-[2px] rounded-xl transition-all duration-150 cursor-pointer ${isSelected ? 'music-gradient shadow-md shadow-[#c1ff72]/20' : 'bg-transparent'}`}
                    >
                      <span className={`flex items-center justify-center w-full min-h-[44px] px-3 sm:px-6 py-2 rounded-[10px] text-[15px] sm:text-[16px] whitespace-nowrap transition-colors duration-150 ${isSelected ? 'bg-[#000000] text-[#ffffff] font-bold' : 'bg-transparent text-white/70 hover:text-[#ffffff] hover:bg-white/10 font-semibold'}`}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {lyricsOption === 'Custom' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Custom Composition Lyrics</label>
                <textarea
                  value={customLyrics}
                  onChange={(e) => setCustomLyrics(e.target.value)}
                  placeholder={`[0:00 - 0:15] Hey this is your song\n[0:15 - ] You can write any lyrics you want`}
                  className="w-full min-h-[160px] bg-[#000000] text-[#ffffff] border border-white/40 hover:border-[#ffffff] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_0_20px_rgba(193,255,114,0.35)] focus:!border-[#ffffff] rounded-3xl p-5 sm:p-6 text-base sm:text-lg font-light leading-relaxed resize-none focus:bg-[#000000] transition-all duration-200 custom-scrollbar"
                />
              </div>
            )}

            <button 
              onClick={() => handleGenerate()} 
              disabled={(!prompt.trim() && selectedImages.length === 0) || CONFIG.IS_MAINTENANCE_MODE} 
              className={`w-full p-[3px] rounded-full transition-all shadow-xl music-gradient shadow-[#c1ff72]/20 hover:brightness-110 cursor-pointer ${
                ((!prompt.trim() && selectedImages.length === 0) || CONFIG.IS_MAINTENANCE_MODE)
                  ? '' 
                  : `active:scale-[0.98] active:brightness-110 ${isTriggering ? 'scale-[0.98] brightness-125 ring-4 ring-[#c1ff72]/50' : ''}`
              }`}
            >
              <span className="flex items-center justify-center w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-full bg-[#000000] border border-[#000000] text-[#ffffff] text-[20px] sm:text-3xl md:text-[41px] leading-tight font-bold whitespace-nowrap">
                Create Roasttid Beatz
              </span>
            </button>

            <details className="group/terms !mt-3 px-1 text-[12px] text-gray-400">
              <summary className="list-none inline-flex items-center gap-1.5 cursor-pointer select-none text-gray-400 hover:text-white transition-colors py-1">
                <span>Terms &amp; Upload Policy</span>
                <Icons.ChevronDown className="w-3.5 h-3.5 transition-transform duration-150 group-open/terms:rotate-180" />
              </summary>
              <div className="mt-2 leading-relaxed space-y-1.5 text-[11px] text-gray-400">
                <p>
                  By using this feature, you confirm that you have the necessary rights to any content that you upload. Do not generate content that infringes on others’ intellectual property or privacy rights. Your use of this generative AI service is subject to our <a href="https://policies.google.com/terms/generative-ai/use-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Prohibited Use Policy</a>.
                </p>
                <p>
                  Please note that uploads, including those from Google Workspace, may be used to develop and improve Google products and services in accordance with our <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">terms</a>.
                </p>
              </div>
            </details>
          </div>
        </section>

        <div className="space-y-6 pb-12">
          {gen.results.length === 0 ? (
            <div className="group relative transition-all duration-700 ease-in-out transform">
              <div className="relative transition-all duration-700 ease-in-out bg-[#000000]">
                <div className="relative z-[30] flex flex-col md:flex-row mb-8 gap-6 items-center">
                  <div className="relative shrink-0 rounded-3xl overflow-hidden shadow-2xl w-48 h-48 md:w-56 md:h-56">
                    {placeholderVideoFailed ? (
                      <img src="https://model.tattty.com/BEATZ-LOGO.png" alt="Roasttid Beatz" className="w-full h-full object-cover" />
                    ) : (
                      <video
                        src="https://model.tattty.com/BEATZ-VIDEO.mp4"
                        poster="https://model.tattty.com/BEATZ-LOGO.png"
                        autoPlay
                        loop
                        muted
                        playsInline
                        onError={() => setPlaceholderVideoFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-center md:text-left w-full">
                    <div className="space-y-1 relative">
                      <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap">
                        <h4 className="font-extrabold text-[#ffffff] tracking-tight text-2xl sm:text-3xl md:text-4xl">
                          Ready to Synthesize
                        </h4>
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-6 space-y-4">
                      <audio controls className="h-10 w-full rounded-2xl" />
                      <div className="flex gap-4 items-start relative">
                        <div className="flex-1 relative">
                          <button disabled className="w-full p-[2px] rounded-full music-gradient shadow-lg shadow-[#c1ff72]/20 opacity-60 cursor-not-allowed">
                            <span className="flex items-center justify-center gap-2.5 w-full min-h-[44px] py-2.5 px-6 rounded-full bg-[#000000] border border-[#000000] text-[#ffffff] text-sm sm:text-base font-bold tracking-wide whitespace-nowrap">
                              <Icons.Download className="w-4 h-4 text-[#c1ff72] shrink-0" />
                              <span>Download</span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="mb-6 space-y-3">
                    <label className="text-[18px] font-bold uppercase tracking-widest text-gray-400 ml-1">Generation Directive</label>
                    <div className="bg-[#000000] border border-white/40 hover:border-[#ffffff] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_0_20px_rgba(193,255,114,0.35)] rounded-[24px] p-4 sm:p-6 text-[15px] sm:text-[16px] font-mono text-[#ffffff] whitespace-pre-wrap shadow-inner overflow-x-auto transition-all duration-200 custom-scrollbar">
                      {prompt.trim() || 'Your generation directive will appear here once you generate a song...'}
                    </div>
                  </div>

                  <div className="pt-4 pb-2">
                    <div className="space-y-3">
                      <label className="text-[18px] font-bold uppercase tracking-widest text-gray-400 ml-1">Composition Lyrics</label>
                      <div className="bg-[#000000] border border-white/40 hover:border-[#ffffff] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_0_20px_rgba(193,255,114,0.35)] rounded-[32px] p-5 sm:p-8 h-[240px] overflow-y-auto text-[18px] sm:text-[20px] text-[#ffffff] italic whitespace-pre-wrap font-['Georgia',serif] shadow-inner transition-all duration-200 custom-scrollbar">
                        Your generated lyrics will appear here...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            gen.results.map((result) => {
              const isExpanded = result.isExpanded;
              const isEncoding = encodingVideoId === result.id;
              const isGenerating = result.status === 'generating';
              const isFailed = result.status === 'error';
              
              return (
                <div key={result.id} className="group relative">
                  <div className="relative bg-[#000000]">
                    <div className={`relative z-[30] flex gap-6 items-center ${isExpanded ? 'flex-col md:flex-row mb-8' : 'flex-row'}`} onClick={() => !isExpanded && toggleExpand(result.id)} style={{ cursor: isExpanded ? 'default' : 'pointer' }}>
                      <div className={`relative shrink-0 transition-all duration-700 ease-in-out rounded-3xl overflow-hidden shadow-2xl ${isExpanded ? 'w-48 h-48 md:w-56 md:h-56' : 'w-16 h-16'}`}>
                        {result.coverImageUrl ? (
                          <img src={result.coverImageUrl} alt={result.title || "Roasttid Beatz"} className="w-full h-full object-cover" />
                        ) : placeholderVideoFailed ? (
                          <img src="https://model.tattty.com/BEATZ-LOGO.png" alt={result.title || "Roasttid Beatz"} className="w-full h-full object-cover" />
                        ) : (
                          <video
                            src="https://model.tattty.com/BEATZ-VIDEO.mp4"
                            poster="https://model.tattty.com/BEATZ-LOGO.png"
                            autoPlay
                            loop
                            muted
                            playsInline
                            onError={() => setPlaceholderVideoFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {result.audioUrl && !isEncoding && !isGenerating && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const audio = document.getElementById(`audio-${result.id}`) as HTMLAudioElement | null;
                              if (audio) {
                                if (audio.paused) audio.play();
                                else audio.pause();
                              }
                            }}
                            className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-all flex items-center justify-center group/play"
                            aria-label={isResultPlaying === result.id ? "Pause song" : "Play song"}
                          >
                            <div className={`${isExpanded ? 'w-16 h-16' : 'w-10 h-10'} bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-black shadow-xl transition-transform group-hover/play:scale-110 active:scale-95`}>
                              {isResultPlaying === result.id ? (
                                <Icons.Pause className={isExpanded ? 'w-8 h-8' : 'w-5 h-5'} />
                              ) : (
                                <Icons.Play className={isExpanded ? 'w-8 h-8 ml-1' : 'w-5 h-5 ml-0.5'} />
                              )}
                            </div>
                          </button>
                        )}
                        {(isEncoding || isGenerating) && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center"><Icons.Loading className={`${isExpanded ? 'w-12 h-12' : 'w-6 h-6'} text-[#c1ff72] animate-spin`} /></div>}
                      </div>

                      <div className={`flex-1 min-w-0 w-full ${isExpanded ? 'text-center md:text-left' : ''}`}>
                        <div className="space-y-1 relative">
                          <div className={`flex items-center gap-3 sm:gap-4 ${isExpanded ? 'justify-center md:justify-start flex-wrap' : ''}`}>
                            <h4 className={`font-extrabold text-[#ffffff] tracking-tight ${isExpanded ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-lg truncate'}`}>
                              {isFailed ? 'Processing Failed' : (result.title || (isGenerating ? "Synthesizing..." : "Untitled Composition"))}
                            </h4>
                            {(isFailed || result.audioUrl) && (
                              <div className="relative" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleGenerate({ prompt: result.originalPrompt, duration: result.originalDuration, lyricsOption: result.originalLyricsOption })} className="p-[2px] rounded-full music-gradient shadow-lg shadow-[#c1ff72]/20 hover:brightness-110 transition-transform duration-150 active:scale-95 z-20 cursor-pointer">
                                  <span className="flex items-center justify-center gap-2 min-h-[40px] px-5 py-2 rounded-full bg-[#000000] border border-[#000000] text-[#ffffff] text-sm font-bold tracking-wide whitespace-nowrap">
                                    <Icons.RefreshCw className="w-4 h-4 shrink-0 text-[#c1ff72]" />
                                    <span>{isFailed ? 'Retry' : 'Regenerate'}</span>
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                          {isFailed && result.error && (
                            <p className="mt-2 text-sm font-medium text-red-400 break-words">
                              {result.error}
                            </p>
                          )}
                        </div>

                        <div className={`transition-opacity duration-300 overflow-visible ${isExpanded ? 'max-h-[220px] mt-6 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                          {result.audioUrl && (
                            <div className="space-y-4">
                              <audio id={`audio-${result.id}`} onPlay={() => setIsResultPlaying(result.id)} onPause={() => setIsResultPlaying(null)} controls className="h-10 w-full rounded-2xl"><source src={result.audioUrl} /></audio>
                              <div className="flex gap-4 items-start relative">
                                <div className="flex-1 relative group/download" onClick={e => e.stopPropagation()}>
                                  <button onClick={(e) => { e.stopPropagation(); handleDownload(result); }} className={`w-full p-[2px] rounded-full music-gradient shadow-lg shadow-[#c1ff72]/20 hover:brightness-110 transition-transform duration-150 active:scale-[0.98] cursor-pointer ${isEncoding ? 'opacity-60 cursor-wait' : ''}`} disabled={isEncoding}>
                                    <span className="flex items-center justify-center gap-2.5 w-full min-h-[44px] py-2.5 px-6 rounded-full bg-[#000000] border border-[#000000] text-[#ffffff] text-sm sm:text-base font-bold tracking-wide whitespace-nowrap">
                                      {isEncoding ? <Icons.Loading className="w-4 h-4 animate-spin text-[#c1ff72] shrink-0" /> : <Icons.Download className="w-4 h-4 text-[#c1ff72] shrink-0" />}
                                      <span className="tabular-nums">{isEncoding ? `Processing ${Math.round(encodingProgress)}%` : 'Download'}</span>
                                    </span>
                                  </button>
                                  {!isEncoding && (
                                    <div className="absolute top-full left-0 right-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover/download:opacity-100 group-hover/download:translate-y-0 group-hover/download:pointer-events-auto transition-all duration-200 z-[60]">
                                      <div className="bg-[#000000] rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                                        <button onClick={(e) => { e.stopPropagation(); handleDownload(result); }} className="w-full min-h-[48px] flex flex-col justify-center px-4 py-3 text-left hover:bg-white/10 transition-colors">
                                          <div className="text-sm font-bold text-white">Track</div>
                                          <div className="text-xs text-gray-400">High fidelity master</div>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDownloadVideo(result, false); }} className="w-full min-h-[48px] flex flex-col justify-center px-4 py-3 text-left hover:bg-white/10 border-t border-white/15 transition-colors">
                                          <div className="text-sm font-bold text-white">Video</div>
                                          <div className="text-xs text-gray-400">Reactive visual map</div>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDownloadVideo(result, true); }} className="w-full min-h-[48px] flex flex-col justify-center px-4 py-3 text-left hover:bg-white/10 border-t border-white/15 transition-colors">
                                          <div className="text-sm font-bold text-white">Karaoke</div>
                                          <div className="text-xs text-gray-400">Timed sync engine</div>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {!result.audioUrl && isGenerating && <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden mt-6"><div className="h-full music-gradient animate-[loading_2s_infinite]"></div></div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4"><button onClick={(e) => { e.stopPropagation(); toggleExpand(result.id); }} className={`p-2 rounded-full transition-all duration-500 ${isExpanded ? 'bg-[#c1ff72]/20 text-[#c1ff72] rotate-90' : 'text-gray-400 group-hover:text-[#c1ff72]'}`}><Icons.ChevronRight className="w-6 h-6" /></button></div>
                    </div>

                    <div className={`relative z-10 grid transition-all duration-700 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden p-1 -m-1">
                        {/* Generation Directive Box */}
                        {(result.fullPrompt || result.originalPrompt) && (
                          <div className="mb-6 space-y-3">
                            <label className="text-[18px] font-bold uppercase tracking-widest text-gray-400 ml-1">Generation Directive</label>
                            <div className="bg-[#000000] border border-white/40 hover:border-[#ffffff] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_0_20px_rgba(193,255,114,0.35)] rounded-[24px] p-4 sm:p-6 text-[15px] sm:text-[16px] font-mono text-[#ffffff] whitespace-pre-wrap shadow-inner overflow-x-auto transition-all duration-200 custom-scrollbar">
                              {result.fullPrompt || result.originalPrompt}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 pb-2">
                          <div className="space-y-3">
                            <label className="text-[18px] font-bold uppercase tracking-widest text-gray-400 ml-1">Composition Lyrics</label>
                            <div className="bg-[#000000] border border-white/40 hover:border-[#ffffff] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_0_20px_rgba(193,255,114,0.35)] rounded-[32px] p-5 sm:p-8 h-[240px] overflow-y-auto text-xl sm:text-2xl md:text-[32px] leading-relaxed md:leading-[40px] text-center text-[#ffffff] italic whitespace-pre-wrap font-serif shadow-inner transition-all duration-200 custom-scrollbar">{result.lyrics ? cleanLyricsForDisplay(result.lyrics) : (isGenerating ? "Synthesizing narrative..." : "Instrumental")}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
      <style>{`
        @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;