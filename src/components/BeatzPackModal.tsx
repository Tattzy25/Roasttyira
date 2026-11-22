import React, { useCallback, useEffect, useState } from 'react';
import {
  BeatzPack,
  fetchLiveBeatzPacks,
  formatMinorCurrency,
} from '../services/ucpService';
import { Icons } from '../../constants';

interface BeatzPackModalProps {
  isOpen: boolean;
  reasonMessage: string;
  onClose: () => void;
}

export const BeatzPackModal: React.FC<BeatzPackModalProps> = ({
  isOpen,
  reasonMessage,
  onClose,
}) => {
  const [packs, setPacks] = useState<BeatzPack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openedPack, setOpenedPack] = useState<BeatzPack | null>(null);

  const loadPacks = useCallback(async (isCancelled: () => boolean) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const livePacks = await fetchLiveBeatzPacks();
      if (!isCancelled()) {
        setPacks(livePacks);
      }
    } catch (err: any) {
      if (!isCancelled()) {
        setPacks([]);
        setLoadError(err?.message || 'Unable to load Roast Beatz packs from Shopify.');
      }
    } finally {
      if (!isCancelled()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    loadPacks(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadPacks]);

  useEffect(() => {
    if (!isOpen) {
      setOpenedPack(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxCount = packs.reduce((max, p) => Math.max(max, p.beatzCount), 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beatz-pack-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#000000] border border-white/30 rounded-3xl shadow-[0_0_50px_rgba(193,255,114,0.22)] overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[3px] w-full music-gradient" />

        <div className="flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-white/15">
          <div className="min-w-0 space-y-1.5">
            {reasonMessage && (
              <p
                role="status"
                className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#c1ff72] break-words"
              >
                {reasonMessage}
              </p>
            )}
            <h3
              id="beatz-pack-modal-title"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
            >
              Reload Your Roast Beatz
            </h3>
            <p className="text-xs sm:text-sm text-white/65">
              Pick a pack to jump straight to checkout in a new tab. Your current tab, prompt, and groove stay untouched.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Beatz packs popup"
            className="shrink-0 w-10 h-10 rounded-full border border-white/25 bg-white/5 hover:bg-white/15 hover:border-white text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Icons.X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-5 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {openedPack && (
            <div
              role="status"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#c1ff72]/60 bg-[#c1ff72]/10 px-4 py-3.5"
            >
              <p className="text-xs sm:text-sm text-white leading-relaxed">
                Checkout for <span className="font-bold text-[#c1ff72]">{openedPack.title}</span> opened in a new tab. Once you finish paying, close this popup and hit <span className="font-bold">Create Roasttid Beatz</span>!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 px-4 py-2 rounded-full bg-[#c1ff72] text-[#000000] text-xs sm:text-sm font-extrabold hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                I&apos;m Reloaded — Back to Studio
              </button>
            </div>
          )}

          {isLoading ? (
            <div
              role="status"
              aria-label="Loading Roast Beatz packs"
              className="flex flex-col items-center justify-center gap-3 py-14 text-white/75"
            >
              <Icons.Loading aria-hidden="true" className="w-8 h-8 text-[#c1ff72] animate-spin" />
              <p className="text-sm font-medium">Loading live Roast Beatz packs...</p>
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-500/60 bg-red-950/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <p className="text-sm font-medium text-red-200 break-words">{loadError}</p>
              <button
                type="button"
                onClick={() => loadPacks(() => false)}
                className="shrink-0 px-4 py-2 rounded-full bg-[#c1ff72] text-[#000000] text-xs sm:text-sm font-extrabold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {packs.map((pack, index) => {
                const isBest = packs.length > 1 && pack.beatzCount === maxCount;
                const badge = isBest
                  ? 'Best Value'
                  : packs.length === 3 && index === 1
                    ? 'Most Popular'
                    : undefined;
                const perBeatCents = Math.round(pack.priceCents / Math.max(pack.beatzCount, 1));
                const formattedPrice = formatMinorCurrency(pack.priceCents, pack.currency);

                return (
                  <div
                    key={pack.variantGid}
                    className={`relative flex flex-col justify-between rounded-3xl p-4 sm:p-5 bg-[#000000] border transition-all duration-200 ${
                      isBest
                        ? 'border-[#c1ff72] shadow-[0_0_28px_rgba(193,255,114,0.25)]'
                        : 'border-white/30 hover:border-white hover:shadow-[0_0_20px_rgba(193,255,114,0.2)]'
                    }`}
                  >
                    <div>
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/5 mb-4">
                        <img
                          src={pack.imageUrl}
                          alt={`Roast Beatz Pack — ${pack.title}`}
                          className="w-full h-full object-cover"
                        />
                        {badge && (
                          <span
                            className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider ${
                              isBest
                                ? 'bg-[#c1ff72] text-[#000000]'
                                : 'bg-[#000000]/85 text-[#c1ff72] border border-[#c1ff72]/60'
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                          {pack.title}
                        </h4>
                        <span className="text-2xl sm:text-3xl font-extrabold text-[#c1ff72] tabular-nums">
                          {formattedPrice}
                        </span>
                      </div>
                      <p className="text-xs text-white/55 tabular-nums mb-5">
                        {formatMinorCurrency(perBeatCents, pack.currency)} per beat · Instant delivery
                      </p>
                    </div>

                    {pack.available ? (
                      <a
                        href={pack.directCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenedPack(pack)}
                        aria-label={`Get ${pack.title} for ${formattedPrice} — opens Shopify Checkout in a new tab`}
                        className="block w-full p-[2px] rounded-full music-gradient shadow-lg shadow-[#c1ff72]/20 hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        <span className="flex items-center justify-center gap-1.5 w-full min-h-[44px] px-4 py-2.5 rounded-full bg-[#000000] text-white text-sm sm:text-base font-bold whitespace-nowrap">
                          Get {pack.title} — {formattedPrice} ↗
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-center justify-center w-full min-h-[44px] px-4 py-2.5 rounded-full border border-white/20 text-white/45 text-sm font-semibold">
                        Sold Out
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/10 text-xs text-white/50">
            <span>Direct Shopify &amp; Shop Pay checkout · Opens in a new tab</span>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white font-semibold cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
