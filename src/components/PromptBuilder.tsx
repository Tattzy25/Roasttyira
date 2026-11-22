/**
 * PromptBuilder Component
 *
 * This component provides a structured UI for users to build complex music prompts.
 * It allows adding multiple sections (e.g., Intro, Verse, Chorus) and selecting
 * attributes like mood, gender/genre, theme, BPM, and scale for each section.
 *
 * Use Cases:
 * - Assisting users who are unfamiliar with writing effective music generation prompts.
 * - Providing a quick way to experiment with different musical combinations.
 */
import React, { useState } from 'react';
import { Icons, PROMPT_HELPER_CONFIG } from '../../constants';
import { getRandomItem } from '../utils/helpers';

export interface HelperSection {
  id: string;
  type: 'main' | 'append';
  mood?: string;
  gender?: string;
  theme?: string;
  timestamp?: string;
  text?: string;
  bpm?: string;
  scale?: string;
}

type SelectorType = 'mood' | 'gender' | 'theme' | 'timestamp' | 'bpm' | 'scale';

const SELECTOR_LABELS: Record<SelectorType, string> = {
  mood: 'Mood selector',
  gender: 'Genre and style selector',
  theme: 'Song topic selector',
  timestamp: 'Transition timestamp selector',
  bpm: 'Tempo BPM selector',
  scale: 'Musical key and scale selector',
};

interface PromptBuilderProps {
  helperSections: HelperSection[];
  setHelperSections: React.Dispatch<React.SetStateAction<HelperSection[]>>;
  activeSelector: { sectionId: string, type: SelectorType } | null;
  setActiveSelector: React.Dispatch<React.SetStateAction<{ sectionId: string, type: SelectorType } | null>>;
  selectedImages: { data: string, mimeType: string, previewUrl: string }[];
  onImageSelect: () => void;
  onImageRemove: (index: number) => void;
}

export const PromptBuilder: React.FC<PromptBuilderProps> = ({
  helperSections,
  setHelperSections,
  activeSelector,
  setActiveSelector,
  selectedImages,
  onImageSelect,
  onImageRemove
}) => {
  const [customInputValue, setCustomInputValue] = useState('');
  const [menuOffsetX, setMenuOffsetX] = useState(0);

  /**
   * Updates a specific section of the prompt helper.
   * @param id The ID of the section to update.
   * @param updates The partial updates to apply to the section.
   */
  const updateHelperSection = (id: string, updates: Partial<HelperSection>) => {
    setHelperSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  /**
   * Adds a new section to the prompt helper.
   */
  const addHelperSection = () => {
    const lastSection = helperSections[helperSections.length - 1];
    let nextTime = "0:30";

    if (lastSection && lastSection.timestamp) {
      const parts = lastSection.timestamp.split(':');
      if (parts.length === 2) {
        const currentTotalSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        const nextTotalSeconds = currentTotalSeconds + 30;
        const nextMins = Math.floor(nextTotalSeconds / 60);
        const nextSecs = nextTotalSeconds % 60;
        nextTime = `${nextMins}:${nextSecs.toString().padStart(2, '0')}`;
      }
    }

    const newSection: HelperSection = {
      id: Math.random().toString(36).substring(7),
      type: 'append',
      timestamp: nextTime,
      mood: getRandomItem(PROMPT_HELPER_CONFIG.moods),
      gender: getRandomItem(PROMPT_HELPER_CONFIG.genders)
    };
    setHelperSections(prev => [...prev, newSection]);
  };

  const toggleSelector = (
    e: React.MouseEvent<HTMLButtonElement>,
    sectionId: string,
    type: SelectorType
  ) => {
    e.stopPropagation();
    const isSame = activeSelector?.sectionId === sectionId && activeSelector?.type === type;
    if (isSame) {
      setActiveSelector(null);
      return;
    }

    const anchorEl = e.currentTarget.closest('[data-pill-anchor]') || e.currentTarget;
    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = Math.min(260, window.innerWidth - 24);
    const maxLeft = window.innerWidth - 12 - menuWidth;
    const clampedLeft = Math.max(12, Math.min(rect.left, maxLeft));
    setMenuOffsetX(Math.round(clampedLeft - rect.left));
    setCustomInputValue('');
    setActiveSelector({ sectionId, type });
  };

  /**
   * Renders a dropdown selector anchored directly below the clicked pill.
   */
  const renderSelector = (sectionId: string, type: SelectorType) => {
    if (activeSelector?.sectionId !== sectionId || activeSelector?.type !== type) return null;

    const options = type === 'mood' ? PROMPT_HELPER_CONFIG.moods :
                    type === 'gender' ? PROMPT_HELPER_CONFIG.genders :
                    type === 'theme' ? PROMPT_HELPER_CONFIG.themes :
                    type === 'timestamp' ? PROMPT_HELPER_CONFIG.timestamps :
                    type === 'bpm' ? PROMPT_HELPER_CONFIG.bpms :
                    PROMPT_HELPER_CONFIG.scales;

    const section = helperSections.find(s => s.id === sectionId);
    const currentValue = section ? (section[type as keyof HelperSection] as string) : '';
    const selectorLabel = SELECTOR_LABELS[type];
    const listboxId = `selector-listbox-${sectionId}-${type}`;

    return (
      <div
        role="region"
        aria-label={`${selectorLabel} options`}
        className="absolute top-full mt-2 z-[150] w-[260px] max-w-[calc(100vw-24px)] p-[2px] music-gradient rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.95),0_0_24px_rgba(193,255,114,0.28)]"
        style={{ left: `${menuOffsetX}px` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#000000] text-[#ffffff] rounded-[14px] p-2">
          <div
            id={listboxId}
            role="listbox"
            aria-label={`${selectorLabel} list`}
            tabIndex={0}
            className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar"
          >
            {options.map(opt => {
              const isSelected = currentValue === opt;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-label={opt}
                  key={opt}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateHelperSection(sectionId, { [type]: opt });
                    setActiveSelector(null);
                  }}
                  className={`w-full text-left p-[1.5px] rounded-xl transition-colors cursor-pointer ${isSelected ? 'music-gradient' : 'bg-transparent'}`}
                >
                  <span className={`block w-full px-3.5 py-2 rounded-[10.5px] text-sm leading-snug break-words transition-colors ${isSelected ? 'bg-[#000000] text-[#ffffff] font-bold' : 'bg-transparent text-white/85 hover:bg-white/15 hover:text-[#ffffff] font-medium'}`}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-white/15 mt-2 pt-2">
            <div className="flex items-center gap-2 p-0.5">
              <input
                type="text"
                aria-label={`Custom ${selectorLabel.toLowerCase()} input`}
                placeholder="Custom..."
                className="flex-1 min-w-0 bg-[#0a0a0a] text-[#ffffff] placeholder:text-white/40 border border-white/30 rounded-xl px-3 py-1.5 text-sm"
                value={customInputValue}
                onChange={(e) => setCustomInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInputValue.trim()) {
                    updateHelperSection(sectionId, { [type]: customInputValue.trim() });
                    setCustomInputValue('');
                    setActiveSelector(null);
                  }
                }}
              />
              <button
                type="button"
                aria-label={`Apply custom ${selectorLabel.toLowerCase()}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (customInputValue.trim()) {
                    updateHelperSection(sectionId, { [type]: customInputValue.trim() });
                    setCustomInputValue('');
                    setActiveSelector(null);
                  }
                }}
                className="p-[1.5px] music-gradient rounded-xl hover:brightness-110 active:scale-95 transition-transform cursor-pointer shrink-0"
              >
                <span className="flex items-center justify-center px-3.5 py-1.5 rounded-[10.5px] bg-[#000000] text-[#ffffff] text-xs font-bold">
                  Set
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders a unified gradient-rim black dropdown pill button.
   */
  const renderPillButton = (
    sectionId: string,
    type: SelectorType,
    displayText: string | undefined,
    options?: { compact?: boolean; tabular?: boolean; removable?: boolean }
  ) => {
    const isActive = activeSelector?.sectionId === sectionId && activeSelector?.type === type;
    const innerSizeClasses = 'px-3.5 sm:px-4 py-1.5 min-h-[44px] rounded-[14px] text-[15px] sm:text-xl font-bold';
    const selectorLabel = SELECTOR_LABELS[type];
    const listboxId = `selector-listbox-${sectionId}-${type}`;

    return (
      <div data-pill-anchor className="relative min-w-0 max-w-full">
        <div
          className={`inline-flex max-w-full p-[2px] music-gradient rounded-2xl transition-all duration-150 ${isActive ? 'ring-2 ring-[#ffffff]/80 shadow-[0_0_24px_rgba(193,255,114,0.5)] brightness-110' : 'shadow-lg shadow-[#c1ff72]/15 hover:brightness-110 hover:shadow-[0_0_20px_rgba(193,255,114,0.35)]'}`}
        >
          <div className={`${innerSizeClasses} ${options?.tabular ? 'tabular-nums' : ''} min-w-0 max-w-full bg-[#000000] border border-[#000000] text-[#ffffff] flex items-center gap-2`}>
            <button
              type="button"
              aria-label={`${selectorLabel}: ${displayText || 'Not set'}`}
              aria-haspopup="listbox"
              aria-expanded={isActive}
              aria-controls={isActive ? listboxId : undefined}
              onClick={(e) => toggleSelector(e, sectionId, type)}
              className="flex items-center gap-2 min-w-0 max-w-full bg-transparent text-[#ffffff] cursor-pointer active:scale-[0.98] transition-transform duration-150"
            >
              <span className="truncate min-w-0">{displayText}</span>
              <Icons.ChevronDown aria-hidden="true" className={`w-4 h-4 shrink-0 text-[#c1ff72] transition-transform duration-150 ${isActive ? 'rotate-180' : ''}`} />
            </button>
            {options?.removable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateHelperSection(sectionId, { [type]: undefined });
                }}
                className="ml-0.5 text-white/60 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                aria-label={`Clear ${selectorLabel.toLowerCase()}`}
              >
                <Icons.X aria-hidden="true" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {renderSelector(sectionId, type)}
      </div>
    );
  };

  /**
   * Renders an optional value pill (e.g., BPM, Scale) for a section.
   */
  const renderOptionalValuePill = (s: HelperSection, type: 'bpm' | 'scale', label: string, compact: boolean = false) => {
    const value = s[type];
    return renderPillButton(s.id, type, value || label, { compact, removable: Boolean(value) });
  };

  return (
    <div
      role="region"
      aria-label="Prompt Builder"
      className="w-full bg-[#000000] text-[#ffffff] border border-white/40 hover:border-[#ffffff] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),0_0_20px_rgba(193,255,114,0.35)] focus-within:border-[#ffffff] focus-within:shadow-[inset_0_0_0_1px_#ffffff,0_0_26px_rgba(193,255,114,0.5)] rounded-3xl p-4 sm:p-8 space-y-5 sm:space-y-6 transition-all duration-200"
      onClick={() => setActiveSelector(null)}
    >
      {helperSections.map((s, sectionIdx) => (
        <div
          key={s.id}
          role="group"
          aria-label={s.type === 'main' ? 'Main song structure' : `Transition section ${sectionIdx}`}
          className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-3 sm:gap-y-3.5 text-[15px] sm:text-xl font-light leading-relaxed"
        >
          {s.type === 'main' ? (
            <>
              <span className="text-gray-400">Create a</span>
              {renderPillButton(s.id, 'mood', s.mood)}
              {renderPillButton(s.id, 'gender', s.gender)}
              <span className="text-gray-400">song about</span>
              {renderPillButton(s.id, 'theme', s.theme)}
              {renderOptionalValuePill(s, 'bpm', 'Add BPM')}
              {renderOptionalValuePill(s, 'scale', 'Add Scale')}
            </>
          ) : (
            <>
              <span className="text-gray-400">[From </span>
              {renderPillButton(s.id, 'timestamp', s.timestamp, { compact: true, tabular: true })}
              <span className="text-gray-400">] the song transitions to a </span>
              {renderPillButton(s.id, 'mood', s.mood, { compact: true })}
              {renderPillButton(s.id, 'gender', s.gender, { compact: true })}
              <span className="text-gray-400"> song.</span>
              {renderOptionalValuePill(s, 'scale', 'Add Scale', true)}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setHelperSections(prev => prev.filter(sec => sec.id !== s.id)); }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:text-red-400 transition-colors p-2 ml-auto cursor-pointer"
                aria-label={`Remove transition section ${sectionIdx}`}
              >
                <Icons.X aria-hidden="true" className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      ))}

      <div className="pt-3 sm:pt-6 flex flex-col gap-4">
        {selectedImages.length > 0 && (
          <div role="list" aria-label="Uploaded reference images" className="flex flex-wrap gap-3 sm:gap-4">
            {selectedImages.map((img, idx) => (
              <div key={idx} role="listitem" className="relative group rounded-2xl overflow-hidden border border-white/40 w-24 h-24 flex-shrink-0 shadow-sm">
                <img src={img.previewUrl} alt={`Uploaded reference image ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onImageRemove(idx); }}
                  className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/80 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                  aria-label={`Remove uploaded reference image ${idx + 1}`}
                >
                  <Icons.X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div role="group" aria-label="Prompt builder actions" className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
          {selectedImages.length < 10 && (
            <button
              type="button"
              aria-label={selectedImages.length > 0 ? `Add Picture (${selectedImages.length} of 10 uploaded)` : 'Add Picture — upload reference images'}
              onClick={(e) => { e.stopPropagation(); onImageSelect(); }}
              className="w-full sm:flex-1 p-[2px] music-gradient rounded-2xl shadow-lg shadow-[#c1ff72]/15 hover:brightness-110 hover:shadow-[0_0_20px_rgba(193,255,114,0.35)] transition-all duration-150 active:scale-[0.99] cursor-pointer"
            >
              <span className="flex items-center justify-center w-full min-h-[48px] px-4 sm:px-5 py-2.5 rounded-[14px] bg-[#000000] border border-[#000000] text-[#ffffff] text-[15px] sm:text-xl font-bold whitespace-nowrap">
                Add Picture{selectedImages.length > 0 ? ` (${selectedImages.length}/10)` : ''}
              </span>
            </button>
          )}
          <button
            type="button"
            aria-label="Add Section — append a new song transition section"
            onClick={(e) => { e.stopPropagation(); addHelperSection(); }}
            className="w-full sm:flex-1 p-[2px] music-gradient rounded-2xl shadow-lg shadow-[#c1ff72]/15 hover:brightness-110 hover:shadow-[0_0_20px_rgba(193,255,114,0.35)] transition-all duration-150 active:scale-[0.99] cursor-pointer"
          >
            <span className="flex items-center justify-center w-full min-h-[48px] px-4 sm:px-5 py-2.5 rounded-[14px] bg-[#000000] border border-[#000000] text-[#ffffff] text-[15px] sm:text-xl font-bold whitespace-nowrap">
              Add Section
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
