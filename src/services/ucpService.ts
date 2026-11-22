export const UCP_MCP_ENDPOINT = 'https://msvrf0-bi.myshopify.com/api/ucp/mcp';
export const UCP_AGENT_PROFILE =
  'https://ucp-agent-profile.facetimefy.com/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json';

export const BEATZ_PACK_VARIANT_GIDS = [
  'gid://shopify/ProductVariant/51149210943743',
  'gid://shopify/ProductVariant/51149210976511',
  'gid://shopify/ProductVariant/51149211009279',
] as const;

export interface BeatzPack {
  variantGid: string;
  beatzCount: number;
  title: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  directCheckoutUrl: string;
  available: boolean;
}

const parseMcpToolContent = (rpcResponse: any): any => {
  if (rpcResponse?.error) {
    throw new Error(rpcResponse.error.message || 'UCP MCP request failed.');
  }
  const result = rpcResponse?.result;
  if (result?.structuredContent) return result.structuredContent;
  const textContent = result?.content?.[0]?.text;
  if (typeof textContent === 'string') {
    return JSON.parse(textContent);
  }
  throw new Error('Unexpected response from Shopify UCP MCP.');
};

export const callUcpTool = async (name: string, args: Record<string, any>): Promise<any> => {
  const res = await fetch(UCP_MCP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name,
        arguments: {
          meta: {
            'ucp-agent': {
              profile: UCP_AGENT_PROFILE,
            },
          },
          ...args,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify UCP error (${res.status})`);
  }

  const rpc = await res.json();
  return parseMcpToolContent(rpc);
};

const parseStrictHttpsUrl = (raw: unknown, fieldName: string): string => {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(`Missing ${fieldName} in Shopify UCP response.`);
  }
  const normalized = raw.trim().replace('msvrf0-bi.myshopify.com', 'roasttid.com');
  const parsed = new URL(normalized);
  if (parsed.protocol !== 'https:') {
    throw new Error(`Invalid protocol for ${fieldName} in Shopify UCP response.`);
  }
  return parsed.toString();
};

export const fetchLiveBeatzPacks = async (): Promise<BeatzPack[]> => {
  const data = await callUcpTool('lookup_catalog', {
    catalog: {
      ids: [...BEATZ_PACK_VARIANT_GIDS],
    },
  });

  const product = data?.products?.[0];
  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) {
    throw new Error('No Roast Beatz packs returned by Shopify UCP.');
  }

  const mapped: BeatzPack[] = variants.map((variant) => {
    const variantGid = typeof variant?.id === 'string' ? variant.id : '';
    const amount = variant?.price?.amount;
    const currency = variant?.price?.currency;
    if (!variantGid || typeof amount !== 'number' || typeof currency !== 'string' || !currency) {
      throw new Error('Incomplete variant pricing in Shopify UCP response.');
    }

    const rawTitle = String(variant?.title ?? '').trim();
    const numericCount = parseInt(rawTitle, 10);
    const beatzCount = Number.isFinite(numericCount) && numericCount > 0 ? numericCount : 1;
    const title = Number.isFinite(numericCount) && numericCount > 0 ? `${numericCount} Beatz` : rawTitle;
    const imageUrl = parseStrictHttpsUrl(
      variant?.media?.[0]?.url ?? product?.media?.[0]?.url,
      'media.url'
    );
    const directCheckoutUrl = parseStrictHttpsUrl(variant?.checkout_url, 'checkout_url');

    return {
      variantGid,
      beatzCount,
      title,
      priceCents: amount,
      currency,
      imageUrl,
      directCheckoutUrl,
      available: variant?.availability?.available !== false,
    };
  });

  return mapped.sort((a, b) => a.beatzCount - b.beatzCount);
};

export const formatMinorCurrency = (cents: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};
