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
import { logFunctionCall } from './src/utils/logger';
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

  // Helper Mode States
  const [helperSections, setHelperSections] = useState<HelperSection[]>([
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

  const addLog = (id: string, message: string) => {
    updateResult(id, prev => ({ ...prev, logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${message}`] }));
  };

  const toggleExpand = (id: string) => {
    setGen(prev => ({ results: prev.results.map(r => r.id === id ? { ...r, isExpanded: !r.isExpanded } : r) }));
  };

  const handleGenerateSongTitle = async (id: string, musicPrompt: string, lyricContext: string) => {
    addLog(id, "Decoding narrative architecture for title...");
    const title = await generateSongTitle(musicPrompt, lyricContext);
    updateResult(id, r => ({ ...r, title }));
    addLog(id, `Identity confirmed: "${title}"`);
    return title;
  };

  const handleGenerateCoverArt = async (id: string, musicPrompt: string, lyricContext: string, title?: string) => {
    addLog(id, "Synthesizing visual representation...");
    const base64Image = await generateCoverArt(musicPrompt, lyricContext, title);
    if (base64Image) {
      updateResult(id, r => ({ ...r, coverImageUrl: base64Image }));
      addLog(id, "Visual synthesis finalized.");
    } else {
      addLog(id, "Visual synthesis skipped.");
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
    const modelDisplayName = isClip ? 'Lyria 3 Clip' : isPro ? 'Lyria 3 Pro' : 'Lyria 3.5';
    addLog(newId, `Waking ${modelDisplayName} engine...`);
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
      console.log('[Raw Generated Lyrics]', textAccumulator);
      if (audioAccumulator) { updateResult(newId, r => ({ ...r, status: 'completed', audioUrl: createAudioUrlFromBase64(audioAccumulator, mimeType) })); addLog(newId, "Signal stabilized."); }
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
      { ...result, coverImageUrl: result.coverImageUrl || "https://model.tattty.com/ROASTTID-BEATZ.png" },
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-12 bg-[#000000]">
        <section className="bg-[#000000] rounded-[40px] p-8 md:p-12 card-shadow border border-gray-100 mb-12 relative z-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="relative group/prompt min-h-[160px] space-y-4 bg-[#000000] text-[#ffffff]">
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                <div className="relative">
                  <textarea
                    ref={promptTextareaRef}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setIsPromptManual(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Atmospheric cinematic track with heavy sub-bass..."
                    className="w-full min-h-[128px] bg-[#000000] text-[#ffffff] border border-[#ffffff] focus:!border-[#ffffff] rounded-3xl p-6 pb-20 text-xl font-light leading-relaxed resize-none focus:bg-[#000000] transition-all pr-16"
                    style={{ overflow: 'hidden' }}
                  />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    {selectedImages.length < 10 && (
                      <button 
                        title="By using this feature, you confirm that you have the necessary rights to any content that you upload. Do not generate content that infringes on others’ intellectual property or privacy rights. Your use of this generative AI service is subject to our Prohibited Use Policy. Please note that uploads, including those from Google Workspace, may be used to develop and improve Google products and services in accordance with our terms." 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`transition-all shadow-sm border border-gray-100 flex items-center justify-center ${selectedImages.length > 0 ? 'p-2.5 rounded-2xl bg-[#000000] text-white' : 'px-4 py-2.5 rounded-2xl bg-white text-gray-500 hover:text-[#000000] gap-2 text-sm font-medium'}`}
                      >
                        <Icons.Camera className="w-5 h-5" />
                        {selectedImages.length === 0 && <span>Add image references</span>}
                      </button>
                    )}
                    {selectedImages.length > 0 && (
                      <div className="flex gap-2">
                        {selectedImages.map((img, idx) => (
                          <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-lg animate-in zoom-in duration-200">
                            <img src={img.previewUrl} className="w-full h-full object-cover" />
                            <button onClick={() => removeImage(idx)} className="absolute top-0 right-0 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur hover:bg-black"><Icons.X className="w-2.5 h-2.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <button 
                      title="I'm feeling lucky" 
                      onClick={handleFeelingLucky} 
                      className={`p-2.5 music-gradient text-white shadow-lg shadow-[#c1ff72]/20 hover:brightness-110 rounded-2xl transition-all active:scale-90 ${isPromptManual && prompt.trim() !== '' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                      <Icons.Sparkles className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
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
                <div className="mt-3 px-1 text-[11px] text-gray-400 leading-relaxed space-y-1">
                  <p>
                    By using this feature, you confirm that you have the necessary rights to any content that you upload. Do not generate content that infringes on others’ intellectual property or privacy rights. Your use of this generative AI service is subject to our <a href="https://policies.google.com/terms/generative-ai/use-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Prohibited Use Policy</a>.
                  </p>
                  <p>
                    Please note that uploads, including those from Google Workspace, may be used to develop and improve Google products and services in accordance with our <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">terms</a>.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Model / Length</label>
                <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
                  {(['Lyria 3.5', 'Lyria 3 Pro', 'Lyria 3 Clip (30s)'] as Duration[]).map((opt) => (
                    <button key={opt} onClick={() => setDuration(opt)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${duration === opt ? 'music-gradient text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                      <span className={duration === opt ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]' : ''}>{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Lyrics</label>
                <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
                  {(['Auto', 'Custom', 'Instrumental'] as LyricsOption[]).map((opt) => (
                    <button key={opt} onClick={() => setLyricsOption(opt)} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${lyricsOption === opt ? 'music-gradient text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                      <span className={lyricsOption === opt ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]' : ''}>{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {lyricsOption === 'Custom' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Custom Composition Lyrics</label>
                <textarea
                  value={customLyrics}
                  onChange={(e) => setCustomLyrics(e.target.value)}
                  placeholder={`[0:00 - 0:15] Hey this is your song\n[0:15 - ] You can write any lyrics you want`}
                  className="w-full min-h-[160px] bg-[#000000] text-[#ffffff] border border-gray-100 rounded-3xl p-6 text-lg font-light leading-relaxed resize-none focus:bg-[#000000] transition-all custom-scrollbar"
                />
              </div>
            )}

            <button 
              onClick={() => handleGenerate()} 
              disabled={(!prompt.trim() && selectedImages.length === 0) || CONFIG.IS_MAINTENANCE_MODE} 
              className={`w-full py-5 rounded-3xl text-lg font-bold text-white transition-all shadow-xl music-gradient shadow-[#c1ff72]/20 cursor-pointer ${
                ((!prompt.trim() && selectedImages.length === 0) || CONFIG.IS_MAINTENANCE_MODE)
                  ? '' 
                  : `active:scale-[0.98] active:brightness-110 ${isTriggering ? 'scale-[0.98] brightness-125 ring-4 ring-[#c1ff72]/50' : ''}`
              }`}
            >
              <span className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">Generate Song</span>
            </button>
          </div>
        </section>

        <div className="relative mb-12 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200/60"></div></div>
          <div className="relative bg-[#000000] px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Songs Gallery</div>
        </div>

        <div className="space-y-6 pb-12">
          {gen.results.length === 0 ? (
            <div className="group relative transition-all duration-700 ease-in-out transform">
              <div className="relative transition-all duration-700 ease-in-out border border-gray-200/60 shadow-lg rounded-[40px] p-8 pb-12 bg-[#000000]">
                <div className="relative z-[30] flex flex-col md:flex-row mb-8 gap-6 items-center">
                  <div className="relative shrink-0 rounded-3xl overflow-hidden shadow-2xl w-48 h-48 md:w-56 md:h-56">
                    <img src="https://model.tattty.com/ROASTTID-BEATZ.png" alt="Roasttid Beatz" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0 text-center md:text-left w-full">
                    <div className="space-y-1 relative">
                      <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap">
                        <h4 className="font-extrabold text-[#ffffff] tracking-tight truncate text-3xl md:text-4xl">
                          Ready to Synthesize
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#c1ff72] uppercase tracking-widest justify-center md:justify-start">
                        <span className="px-2 py-0.5 bg-[#c1ff72] text-[#000000] rounded">
                          {(duration === 'Lyria 3 Clip (30s)' || duration === 'Clip (30s)') ? 'LYRIA 3 CLIP' : (duration === 'Lyria 3 Pro' || duration === 'Pro') ? 'LYRIA 3 PRO' : 'LYRIA 3.5'}
                        </span>
                        <span>• {(duration === 'Lyria 3 Clip (30s)' || duration === 'Clip (30s)') ? '30s Clip' : 'Full Song'}</span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <audio controls className="h-10 w-full rounded-2xl" />
                      <div className="flex gap-4 items-start relative">
                        <div className="flex-1 relative">
                          <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl music-gradient text-white text-[10px] font-bold uppercase tracking-[0.1em] shadow-lg shadow-[#c1ff72]/20 cursor-pointer">
                            <Icons.Download className="w-4 h-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="mb-6 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Generation Directive</label>
                    <div className="bg-[#000000] border border-gray-100 rounded-[24px] p-6 text-xs font-mono text-[#ffffff] whitespace-pre-wrap shadow-inner overflow-x-auto custom-scrollbar">
                      {prompt.trim() || 'Your generation directive will appear here once you generate a song...'}
                    </div>
                  </div>

                  <div className="pt-4 pb-2">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Composition Lyrics</label>
                      <div className="bg-[#000000] border border-gray-100 rounded-[32px] p-8 h-[240px] overflow-y-auto text-base text-[#ffffff] italic whitespace-pre-wrap font-serif shadow-inner custom-scrollbar">
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
                <div key={result.id} className="group relative transition-all duration-700 ease-in-out transform">
                  <div className={`relative transition-all duration-700 ease-in-out border border-gray-200/60 shadow-lg rounded-[40px] ${isExpanded ? 'p-8 pb-12' : 'p-4'}`}>
                    <div className="absolute inset-0 z-0 rounded-[40px] overflow-hidden" style={{ backgroundImage: result.coverImageUrl ? `url(${result.coverImageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <div className="absolute inset-0 transition-opacity duration-700 ease-in-out backdrop-blur-2xl bg-[#000000] opacity-100" />
                    </div>

                    <div className={`relative z-[30] flex transition-all duration-700 ease-in-out gap-6 items-center ${isExpanded ? 'flex-col md:flex-row mb-8' : 'flex-row'}`} onClick={() => !isExpanded && toggleExpand(result.id)} style={{ cursor: isExpanded ? 'default' : 'pointer' }}>
                      <div className={`relative shrink-0 transition-all duration-700 ease-in-out rounded-3xl overflow-hidden shadow-2xl ${isExpanded ? 'w-48 h-48 md:w-56 md:h-56' : 'w-16 h-16'}`}>
                        <img src={result.coverImageUrl || "https://model.tattty.com/ROASTTID-BEATZ.png"} alt={result.title || "Roasttid Beatz"} className="w-full h-full object-cover" />
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

                      <div className={`flex-1 min-w-0 transition-all duration-700 ease-in-out ${isExpanded ? 'text-center md:text-left' : ''}`}>
                        <div className="space-y-1 relative">
                          <div className={`flex items-center gap-4 ${isExpanded ? 'justify-center md:justify-start flex-wrap' : ''}`}>
                            <h4 className={`font-extrabold text-[#ffffff] tracking-tight transition-all duration-700 ease-in-out truncate ${isExpanded ? 'text-3xl md:text-4xl' : 'text-lg'}`}>
                              {isFailed ? 'Processing Failed' : (result.title || (isGenerating ? "Synthesizing..." : "Untitled Composition"))}
                            </h4>
                            {(isFailed || result.audioUrl) && (
                              <div className="relative" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleGenerate({ prompt: result.originalPrompt, duration: result.originalDuration, lyricsOption: result.originalLyricsOption })} className="flex items-center justify-center gap-2 px-4 py-2 rounded-full music-gradient border border-[#c1ff72]/40 text-white text-[10px] font-bold uppercase tracking-[0.1em] hover:brightness-110 transition-all shadow-sm active:scale-95 z-20">
                                  <Icons.RefreshCw className="w-3.5 h-3.5 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{isFailed ? 'Retry' : 'Regenerate'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 text-[10px] font-bold text-[#c1ff72] uppercase tracking-widest transition-all duration-700 ease-in-out ${isExpanded ? 'justify-center md:justify-start' : ''}`}>
                            <span className="px-2 py-0.5 bg-[#c1ff72] text-[#000000] rounded">{(result.duration === 'Lyria 3 Clip (30s)' || result.duration === 'Clip (30s)') ? 'LYRIA 3 CLIP' : (result.duration === 'Lyria 3 Pro' || result.duration === 'Pro') ? 'LYRIA 3 PRO' : 'LYRIA 3.5'}</span>
                            <span>• {(result.duration === 'Lyria 3 Clip (30s)' || result.duration === 'Clip (30s)') ? '30s Clip' : 'Full Song'}</span>
                          </div>
                        </div>

                        <div className={`transition-all duration-700 ease-in-out overflow-visible ${isExpanded ? 'max-h-[200px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                          {result.audioUrl && (
                            <div className="space-y-4">
                              <audio id={`audio-${result.id}`} onPlay={() => setIsResultPlaying(result.id)} onPause={() => setIsResultPlaying(null)} controls className="h-10 w-full rounded-2xl"><source src={result.audioUrl} /></audio>
                              <div className="flex gap-4 items-start relative">
                                <div className="flex-1 relative group/download" onClick={e => e.stopPropagation()}>
                                  <button onClick={(e) => { e.stopPropagation(); handleDownload(result); }} className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl music-gradient text-white text-[10px] font-bold uppercase tracking-[0.1em] hover:brightness-110 transition-all shadow-lg shadow-[#c1ff72]/20 active:scale-95 ${isEncoding ? 'opacity-50 cursor-wait' : ''}`} disabled={isEncoding}>
                                    {isEncoding ? <Icons.Loading className="w-4 h-4 animate-spin drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" /> : <Icons.Download className="w-4 h-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />}
                                    <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{isEncoding ? `Processing ${Math.round(encodingProgress)}%` : 'Download'}</span>
                                  </button>
                                  {!isEncoding && (
                                    <div className="absolute top-full left-0 right-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover/download:opacity-100 group-hover/download:translate-y-0 group-hover/download:pointer-events-auto transition-all duration-300 z-[60]">
                                      <div className="bg-[#000000] rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
                                        <button onClick={(e) => { e.stopPropagation(); handleDownload(result); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-900 transition-colors">
                                          <div className="w-8 h-8 bg-[#c1ff72]/15 text-[#c1ff72] rounded-lg flex items-center justify-center"><Icons.Download className="w-4 h-4" /></div>
                                          <div><div className="text-[10px] font-bold uppercase tracking-wider text-white">Track</div><div className="text-[9px] text-gray-400">High fidelity master</div></div>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDownloadVideo(result, false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-900 border-t border-gray-800 transition-colors">
                                          <div className="w-8 h-8 bg-[#c1ff72]/15 text-[#c1ff72] rounded-lg flex items-center justify-center"><Icons.Video className="w-4 h-4" /></div>
                                          <div><div className="text-[10px] font-bold uppercase tracking-wider text-white">Video</div><div className="text-[9px] text-gray-400">Reactive visual map</div></div>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDownloadVideo(result, true); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-900 border-t border-gray-800 transition-colors">
                                          <div className="w-8 h-8 bg-[#c1ff72]/15 text-[#c1ff72] rounded-lg flex items-center justify-center"><Icons.Sparkles className="w-4 h-4" /></div>
                                          <div><div className="text-[10px] font-bold uppercase tracking-wider text-white">Karaoke</div><div className="text-[9px] text-gray-400">Timed sync engine</div></div>
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
                      <div className="overflow-hidden">
                        {/* Generation Directive Box */}
                        {(result.fullPrompt || result.originalPrompt) && (
                          <div className="mb-6 space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Generation Directive</label>
                            <div className="bg-[#000000] border border-gray-100 rounded-[24px] p-6 text-xs font-mono text-[#ffffff] whitespace-pre-wrap shadow-inner overflow-x-auto custom-scrollbar">
                              {result.fullPrompt || result.originalPrompt}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 pb-2">
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Composition Lyrics</label>
                            <div className="bg-[#000000] border border-gray-100 rounded-[32px] p-8 h-[240px] overflow-y-auto text-[32px] leading-[40px] text-center text-[#ffffff] italic whitespace-pre-wrap font-serif shadow-inner custom-scrollbar">{result.lyrics ? cleanLyricsForDisplay(result.lyrics) : (isGenerating ? "Synthesizing narrative..." : "Instrumental")}</div>
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