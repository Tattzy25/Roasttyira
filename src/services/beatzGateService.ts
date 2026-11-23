export const BEATZ_CLICKS_WEBHOOK_URL = 'https://beatz-clicks.roasttid.com';

export type BeatzGateResult =
  | { status: 'ok' }
  | { status: 'sign_in_required'; message: string }
  | { status: 'insufficient_funds'; message: string }
  | { status: 'error'; message: string };

const readCustomerIdFromDom = (doc: Document | null | undefined): string => {
  if (!doc) return '';
  try {
    const candidates = [
      doc.documentElement?.getAttribute('data-customer-id'),
      doc.body?.getAttribute('data-customer-id'),
      doc.querySelector('[data-customer-id]')?.getAttribute('data-customer-id'),
      doc.querySelector('[data-customer_id]')?.getAttribute('data-customer_id'),
      doc.querySelector('meta[name="customer-id"]')?.getAttribute('content'),
      doc.querySelector('meta[name="customer_id"]')?.getAttribute('content'),
      (
        doc.querySelector(
          'input[name="customer_id"], input[name="customerId"], #customer_id, #customerId'
        ) as HTMLInputElement | null
      )?.value,
    ];
    for (const val of candidates) {
      if (val && String(val).trim()) return String(val).trim();
    }
  } catch {
    // Ignore cross-origin or DOM read errors
  }
  return '';
};

const readCustomerIdFromWindow = (win: Window | null | undefined): string => {
  if (!win) return '';
  try {
    const w = win as any;
    const candidates = [
      w?.ShopifyAnalytics?.meta?.page?.customerId,
      w?.__st?.cid,
      w?.meta?.page?.customerId,
      w?.Shopify?.customer?.id,
      w?.customer_id,
      w?.customerId,
    ];
    for (const val of candidates) {
      if (val !== undefined && val !== null && String(val).trim()) return String(val).trim();
    }
  } catch {
    // Ignore cross-origin access errors
  }
  return '';
};

export const readCustomerId = (): string => {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromQuery =
      searchParams.get('customer_id') ||
      searchParams.get('customerId') ||
      searchParams.get('cid');
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  } catch {
    // Ignore URL parse errors
  }

  const fromDom = readCustomerIdFromDom(typeof document !== 'undefined' ? document : null);
  if (fromDom) return fromDom;

  const fromWindow = readCustomerIdFromWindow(typeof window !== 'undefined' ? window : null);
  if (fromWindow) return fromWindow;

  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const fromParentDom = readCustomerIdFromDom(window.parent.document);
      if (fromParentDom) return fromParentDom;
      const fromParentWindow = readCustomerIdFromWindow(window.parent);
      if (fromParentWindow) return fromParentWindow;
    }
  } catch {
    // Cross-origin parent iframe; customer_id comes from URL query or postMessage
  }

  try {
    const fromStorage =
      window.localStorage?.getItem('customer_id') ||
      window.localStorage?.getItem('customerId') ||
      window.sessionStorage?.getItem('customer_id') ||
      window.sessionStorage?.getItem('customerId');
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch {
    // Ignore storage access errors
  }

  return '';
};

export const subscribeCustomerIdMessages = (onCustomerId: (id: string) => void): (() => void) => {
  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    const incoming = data.customer_id ?? data.customerId;
    if (incoming !== undefined && incoming !== null) {
      onCustomerId(String(incoming).trim());
    }
  };
  window.addEventListener('message', handleMessage);
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'ROASTTID_REQUEST_CUSTOMER_ID' }, '*');
    }
  } catch {
    // Ignore cross-origin postMessage errors
  }
  return () => window.removeEventListener('message', handleMessage);
};

const extractWebhookErrorMessage = (payload: any): string | null => {
  if (!payload) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed || null;
  }
  if (typeof payload === 'object') {
    for (const key of ['error', 'error_message', 'errorMessage', 'message', 'msg', 'detail', 'reason']) {
      const val = payload[key];
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (val && typeof val === 'object') {
        const nested = extractWebhookErrorMessage(val);
        if (nested) return nested;
      }
    }
    for (const [key, val] of Object.entries(payload)) {
      if (key === 'status') continue;
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
  }
  return null;
};

const getWebhookError = (ok: boolean, status: number, data: any, rawText: string): string | null => {
  const statusStr =
    data && typeof data === 'object' && typeof data.status === 'string'
      ? data.status.trim().toLowerCase()
      : null;

  const explicitFailure =
    !ok ||
    Boolean(
      data &&
        typeof data === 'object' &&
        ((typeof data.error === 'string' && data.error.trim() !== '') ||
          data.error === true ||
          (data.error && typeof data.error === 'object') ||
          data.success === false ||
          data.ok === false ||
          (statusStr !== null && statusStr !== 'ok' && statusStr !== 'success'))
    );

  if (!explicitFailure) return null;

  const extracted = extractWebhookErrorMessage(data);
  if (extracted) return extracted;
  if (rawText && rawText.trim()) return rawText.trim();
  return `Request failed (${status})`;
};

const isMissingCustomerError = (status: number, data: any, message: string): boolean => {
  if (status === 401) return true;

  const extraFields =
    data && typeof data === 'object'
      ? [data.code, data.error_code, data.errorCode, data.reason, data.error, data.message]
          .filter((v) => typeof v === 'string')
          .join(' ')
      : '';
  const combined = `${message} ${extraFields}`.toLowerCase();

  return /customer[\s_-]*id[\s_-]*(is[\s_-]*)?(missing|required|not[\s_-]*found|invalid|empty)|missing[\s_-]*customer|customer[\s_-]*(is[\s_-]*)?missing|not[\s_-]*(signed|logged)[\s_-]*in|sign[\s_-]*in[\s_-]*required|login[\s_-]*required|unauthenticated|unauthorized/.test(
    combined
  );
};

const isInsufficientFundsError = (status: number, data: any, message: string): boolean => {
  if (status === 402) return true;

  const extraFields =
    data && typeof data === 'object'
      ? [data.code, data.error_code, data.errorCode, data.reason, data.error, data.message]
          .filter((v) => typeof v === 'string')
          .join(' ')
      : '';
  const combined = `${message} ${extraFields}`.toLowerCase();

  if (
    /insufficient|insuficent|not enough|out of beatz|no beatz|0 beatz|zero beatz|low balance|no credits|out of credits|zero credits|0 credits|funds|need more beatz|buy beatz|reload beatz|top up/.test(
      combined
    )
  ) {
    return true;
  }

  if (data && typeof data === 'object') {
    const remaining = data.beatz_current ?? data.beatz ?? data.balance ?? data.credits;
    if (remaining === 0 || remaining === '0') return true;
  }

  return false;
};

export const checkBeatzAccess = async (knownCustomerId?: string): Promise<BeatzGateResult> => {
  try {
    const activeCustomerId = (knownCustomerId || '').trim() || readCustomerId();
    const res = await fetch(BEATZ_CLICKS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'beatz_click',
        customer_id: activeCustomerId,
      }),
    });

    const rawText = await res.text();
    let parsedData: any = null;
    if (rawText) {
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        parsedData = null;
      }
    }

    const errMsg = getWebhookError(res.ok, res.status, parsedData, rawText);
    if (!errMsg) {
      return { status: 'ok' };
    }

    if (isMissingCustomerError(res.status, parsedData, errMsg)) {
      return { status: 'sign_in_required', message: errMsg };
    }

    if (isInsufficientFundsError(res.status, parsedData, errMsg)) {
      return { status: 'insufficient_funds', message: errMsg };
    }

    return { status: 'error', message: errMsg };
  } catch (err: any) {
    return { status: 'error', message: err?.message || 'Unable to reach Beatz service.' };
  }
};
