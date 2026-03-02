"use strict";

/**
 * Reads Shopify Admin API config from environment variables.
 * @return {{domain: string, accessToken: string, apiVersion: string}}
 */
function getShopifyAdminConfig() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION;

  const missing = [];
  if (!domain) missing.push("SHOPIFY_STORE_DOMAIN");
  if (!accessToken) missing.push("SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!apiVersion) missing.push("SHOPIFY_ADMIN_API_VERSION");

  if (missing.length > 0) {
    throw new Error(
      `Missing required Shopify Admin env vars: ${missing.join(", ")}`,
    );
  }

  return {domain, accessToken, apiVersion};
}

/**
 * Executes a Shopify Admin GraphQL request.
 * Throws on HTTP errors and GraphQL userErrors.
 * @param {string} query GraphQL query/mutation
 * @param {Record<string, any>=} variables Variables object
 * @return {Promise<any>} Parsed JSON response
 */
async function shopifyAdminGraphQL(query, variables = {}) {
  const {domain, accessToken, apiVersion} = getShopifyAdminConfig();
  const endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({query, variables}),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const detail = body ? JSON.stringify(body) : "No JSON error body";
    throw new Error(
      `Shopify Admin API HTTP ${response.status} ${response.statusText}: ${detail}`,
    );
  }

  if (body?.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(body.errors)}`);
  }

  const data = body?.data;
  if (data && typeof data === "object") {
    for (const key of Object.keys(data)) {
      const node = data[key];
      if (node?.userErrors?.length) {
        throw new Error(
          `Shopify userErrors from ${key}: ${JSON.stringify(node.userErrors)}`,
        );
      }
    }
  }

  return body;
}

/**
 * Creates a Shopify basic discount code.
 * @param {{
 *   code: string,
 *   title: string,
 *   valueType: "PERCENTAGE"|"FIXED_AMOUNT",
 *   value: number,
 *   startsAt: string,
 *   endsAt?: string,
 *   usageLimit?: number,
 *   oncePerCustomer?: boolean,
 * }} params
 * @return {Promise<{id: string, code: string, title: string, status: string}>}
 */
async function createBasicDiscountCode({
  code,
  title,
  valueType,
  value,
  startsAt,
  endsAt,
  usageLimit,
  oncePerCustomer,
}) {
  if (!code || !title || !valueType || value === undefined || !startsAt) {
    throw new Error(
      "Missing required params for createBasicDiscountCode: code, title, valueType, value, startsAt",
    );
  }

  const mutation = `#graphql
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              status
              codes(first: 1) {
                nodes {
                  code
                }
              }
            }
          }
        }
        userErrors {
          field
          code
          message
        }
      }
    }
  `;

  const customerGetsValue =
    valueType === "PERCENTAGE"
      ? {percentage: Number(value) / 100}
      : {discountAmount: {amount: Number(value), appliesOnEachItem: false}};

  const variables = {
    basicCodeDiscount: {
      title,
      code,
      startsAt,
      endsAt,
      usageLimit,
      appliesOncePerCustomer: oncePerCustomer,
      customerSelection: {all: true},
      customerGets: {
        value: customerGetsValue,
        items: {all: true},
      },
    },
  };

  const result = await shopifyAdminGraphQL(mutation, variables);
  const created = result?.data?.discountCodeBasicCreate?.codeDiscountNode;
  const basic = created?.codeDiscount;
  const createdCode = basic?.codes?.nodes?.[0]?.code || code;

  if (!created?.id) {
    throw new Error(
      `Shopify discount creation returned no codeDiscountNode.id: ${JSON.stringify(result)}`,
    );
  }

  return {
    id: created.id,
    code: createdCode,
    title: basic?.title || title,
    status: basic?.status || "UNKNOWN",
  };
}

module.exports = {
  getShopifyAdminConfig,
  shopifyAdminGraphQL,
  createBasicDiscountCode,
};

/*
  Simple local invocation example (do not run in production shell):
  node -e "const c=require('./shopifyAdminClient'); c.createBasicDiscountCode({code:'WELCOME10',title:'Welcome 10%',valueType:'PERCENTAGE',value:10,startsAt:new Date().toISOString()}).then(console.log).catch(console.error)"
*/
