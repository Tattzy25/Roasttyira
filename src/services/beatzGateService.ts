export const BEATZ_CLICKS_WEBHOOK_URL = 'https://beatz-clicks.roasttid.com';

export type BeatzGateResult =
  | { status: 'ok' }
  | { status: 'sign_in_required'; message: string }
  | { status: 'insufficient_funds'; message: string }
  | { status: 'error'; message: string };

export const readCustomerId = (): string => {
  if (typeof window === 'undefined') return '';
  const searchParams = new URLSearchParams(window.location.search);
  const fromQuery =
    searchParams.get('customer_id') ??
    searchParams.get('customerId') ??
    searchParams.get('cid');
  return fromQuery ? fromQuery.trim() : '';
};

export const subscribeCustomerIdMessages = (onCustomerId: (id: string) => void): (() => void) => {
  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    const incoming = (data as Record<string, unknown>).customer_id ?? (data as Record<string, unknown>).customerId;
    if (typeof incoming === 'string' || typeof incoming === 'number') {
      const normalized = String(incoming).trim();
      if (normalized) {
        onCustomerId(normalized);
      }
    }
  };

  window.addEventListener('message', handleMessage);

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'ROASTTID_REQUEST_CUSTOMER_ID' }, '*');
  }

  return () => window.removeEventListener('message', handleMessage);
};

const extractWebhookErrorMessage = (payload: unknown): string | null => {
  if (!payload) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed || null;
  }
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['error', 'error_message', 'errorMessage', 'message', 'msg', 'detail', 'reason']) {
      const val = record[key];
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (val && typeof val === 'object') {
        const nested = extractWebhookErrorMessage(val);
        if (nested) return nested;
      }
    }
    for (const [key, val] of Object.entries(record)) {
      if (key === 'status') continue;
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
  }
  return null;
};

const getWebhookError = (ok: boolean, status: number, data: unknown, rawText: string): string | null => {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const statusStr =
    record && typeof record.status === 'string' ? record.status.trim().toLowerCase() : null;

  const explicitFailure =
    !ok ||
    Boolean(
      record &&
        ((typeof record.error === 'string' && record.error.trim() !== '') ||
          record.error === true ||
          (record.error && typeof record.error === 'object') ||
          record.success === false ||
          record.ok === false ||
          (statusStr !== null && statusStr !== 'ok' && statusStr !== 'success'))
    );

  if (!explicitFailure) return null;

  const extracted = extractWebhookErrorMessage(data);
  if (extracted) return extracted;
  if (rawText.trim()) return rawText.trim();
  return `Request failed (${status})`;
};

const isMissingCustomerError = (status: number, data: unknown, message: string): boolean => {
  if (status === 401) return true;

  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const extraFields = record
    ? [record.code, record.error_code, record.errorCode, record.reason, record.error, record.message]
        .filter((v): v is string => typeof v === 'string')
        .join(' ')
    : '';
  const combined = `${message} ${extraFields}`.toLowerCase();

  return /customer[\s_-]*id[\s_-]*(is[\s_-]*)?(missing|required|not[\s_-]*found|invalid|empty)|missing[\s_-]*customer|customer[\s_-]*(is[\s_-]*)?missing|not[\s_-]*(signed|logged)[\s_-]*in|sign[\s_-]*in[\s_-]*required|login[\s_-]*required|unauthenticated|unauthorized/.test(
    combined
  );
};

const isInsufficientFundsError = (status: number, data: unknown, message: string): boolean => {
  if (status === 402) return true;

  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const extraFields = record
    ? [record.code, record.error_code, record.errorCode, record.reason, record.error, record.message]
        .filter((v): v is string => typeof v === 'string')
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

  if (record) {
    const remaining = record.beatz_current ?? record.beatz ?? record.balance ?? record.credits;
    if (remaining === 0 || remaining === '0') return true;
  }

  return false;
};

export const checkBeatzAccess = async (knownCustomerId?: string): Promise<BeatzGateResult> => {
  try {
    const activeCustomerId = knownCustomerId ? knownCustomerId.trim() : readCustomerId();
    const res = await fetch(BEATZ_CLICKS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'beatz_click',
        customer_id: activeCustomerId,
      }),
    });

    const rawText = await res.text();
    const contentType = res.headers.get('content-type') ?? '';
    const parsedData: unknown =
      rawText && contentType.toLowerCase().includes('application/json') ? JSON.parse(rawText) : null;

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', message };
  }
};
