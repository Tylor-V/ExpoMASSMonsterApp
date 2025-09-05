import env from './env';

const {
  SHOPIFY_DOMAIN,
  SHOPIFY_API_VERSION,
  SHOPIFY_ADMIN_TOKEN,
} = env as any;

const apiVersion = SHOPIFY_API_VERSION || '2024-01';

function buildAdminUrl(path: string) {
  return `https://${SHOPIFY_DOMAIN}/admin/api/${apiVersion}/${path}`;
}

async function adminFetch(path: string, options: RequestInit = {}) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_ADMIN_TOKEN) {
    console.warn('Shopify admin configuration missing');
    return null;
  }
  const res = await fetch(buildAdminUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    console.error('Shopify admin request failed', res.status);
    return null;
  }
  return res.json();
}

export async function findShopifyCustomerByEmail(email: string): Promise<string | null> {
  const data = await adminFetch(
    `customers/search.json?query=email:${encodeURIComponent(email)}`,
  );
  return data?.customers?.[0]?.id ?? null;
}

export async function createShopifyCustomerAccount(
  email: string,
  firstName?: string,
  lastName?: string,
): Promise<string | null> {
  const body = {
    customer: {
      email,
      first_name: firstName,
      last_name: lastName,
    },
  };
  const data = await adminFetch('customers.json', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data?.customer?.id ?? null;
}

export async function ensureShopifyCustomer(
  email: string,
  firstName?: string,
  lastName?: string,
): Promise<string | null> {
  const existing = await findShopifyCustomerByEmail(email);
  if (existing) return existing;
  return await createShopifyCustomerAccount(email, firstName, lastName);
}
