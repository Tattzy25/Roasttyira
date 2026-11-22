import React, { useEffect, useState } from 'react';
import { Icons } from '../../constants';

export const ROASTTID_ACCOUNT_SIGN_IN_URL = 'https://account.roasttid.com';
export const ROASTTID_STORE_DOMAIN = 'https://roasttid.com';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const [hasOpenedSignIn, setHasOpenedSignIn] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasOpenedSignIn(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignInClick = () => {
    setHasOpenedSignIn(true);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: 'ROASTTID_SIGN_IN_REQUEST', url: ROASTTID_ACCOUNT_SIGN_IN_URL },
          '*'
        );
      }
    } catch {
      // Ignore cross-origin postMessage errors
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roasttid-signin-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#000000] border border-white/30 rounded-3xl shadow-[0_0_50px_rgba(193,255,114,0.22)] overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[3px] w-full music-gradient" />

        {/* Shopify Storefront Web Component store context */}
        {React.createElement('shopify-store', {
          'store-domain': ROASTTID_STORE_DOMAIN,
          country: 'US',
          language: 'en',
        })}

        <div className="flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-white/15">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#c1ff72]">
              Roasttid Account
            </p>
            <h3
              id="roasttid-signin-modal-title"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
            >
              Sign In to Create
            </h3>
            <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
              Sign in with Shop, Google, or email to unlock the studio and sync your Roast Beatz balance.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in popup"
            className="shrink-0 w-10 h-10 rounded-full border border-white/25 bg-white/5 hover:bg-white/15 hover:border-white text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Icons.X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          {hasOpenedSignIn && (
            <div
              role="status"
              className="rounded-2xl border border-[#c1ff72]/60 bg-[#c1ff72]/10 px-4 py-3.5 space-y-3"
            >
              <p className="text-xs sm:text-sm text-white leading-relaxed">
                Roasttid sign-in opened in a new tab. Once you&apos;re signed in, return to the studio and hit{' '}
                <span className="font-bold text-[#c1ff72]">Create Roasttid Beatz</span>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2 rounded-full bg-[#c1ff72] text-[#000000] text-xs sm:text-sm font-extrabold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                I&apos;m Signed In — Back to Studio
              </button>
            </div>
          )}

          {/* Direct Sign-In CTA (opens in a new tab so Shopify frame-ancestors CSP never blocks iframes) */}
          <a
            href={ROASTTID_ACCOUNT_SIGN_IN_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleSignInClick}
            aria-label="Sign in to Roasttid account — opens account.roasttid.com in a new tab"
            className="block w-full p-[2px] rounded-full music-gradient shadow-lg shadow-[#c1ff72]/20 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center justify-center gap-2 w-full min-h-[50px] px-5 py-3 rounded-full bg-[#000000] text-white text-base sm:text-lg font-bold whitespace-nowrap">
              <span>Sign In to Roasttid</span>
              <span aria-hidden="true">↗</span>
            </span>
          </a>

          {/* Native Shopify Account Web Component themed to Roasttid */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">Shop / Customer Account</p>
              <p className="text-[11px] text-white/55 truncate">account.roasttid.com</p>
            </div>
            <div className="shrink-0 roasttid-shopify-account">
              {React.createElement(
                'shopify-account',
                {
                  menu: 'customer-account-main-menu',
                  'sign-in-url': ROASTTID_ACCOUNT_SIGN_IN_URL,
                },
                React.createElement(
                  'span',
                  {
                    slot: 'signed-out-avatar',
                    className:
                      'inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#c1ff72]/50 bg-[#000000] text-xs font-bold text-[#c1ff72] hover:bg-[#c1ff72] hover:text-[#000000] transition-colors cursor-pointer',
                  },
                  'Account'
                )
              )}
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/10 text-xs text-white/50">
            <span>Prompt &amp; lyrics stay saved in this tab</span>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .roasttid-shopify-account shopify-account {
          --shopify-account-signed-in-avatar-size: 40px;
          --shopify-account-signed-in-avatar-color-background: #c1ff72;
          --shopify-account-signed-in-avatar-color-text: #000000;
          --shopify-account-font-heading: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --shopify-account-font-heading-weight: 800;
          --shopify-account-font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --shopify-account-font-body-weight: 500;
          --shopify-account-radius-base: 16px;
          --shopify-account-radius-dialog: 24px;
          --shopify-account-radius-button: 99px;
          --shopify-account-radius-button-small: 10px;
          --shopify-account-radius-input: 12px;
          --shopify-account-dialog-position-top: 56px;
          --shopify-account-color-background: #0a0a0a;
          --shopify-account-color-text: #ffffff;
          --shopify-account-color-accent: #c1ff72;
          --shopify-account-color-accent-text: #000000;
          --shopify-account-color-border: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};
