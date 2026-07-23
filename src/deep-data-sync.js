/**
 * Glass Outlet → ActiveCampaign Deep Data sync
 *
 * 1. Create (or reuse) an e-commerce connection
 * 2. Create/update an ecom customer for contact 1203
 * 3. Create an abandoned cart and a completed order
 *
 * Usage:
 *   cp .env.example .env   # fill AC_API_URL + AC_API_TOKEN
 *   npm install
 *   npm run sync
 */
import { loadEnv } from "./load-env.js";
import { createAcClient } from "./ac-client.js";

loadEnv();

const CONTACT_ID = "1203";

const CONNECTION = {
  service: "glassOutlet",
  externalid: "glassoutlet.com.au",
  name: "Glass Outlet",
  logoUrl:
    "https://www.glassoutlet.com.au/favicon.ico",
  linkUrl: "https://www.glassoutlet.com.au/",
};

const SAMPLE_PRODUCTS = [
  {
    externalid: "GO-BAL-1200",
    name: "Glass Balustrade Panel 1200mm",
    price: 28900,
    quantity: 2,
    category: "Glass Balustrade",
    sku: "BAL-1200",
    description: "Trade glass balustrade panel",
    productUrl: "https://www.glassoutlet.com.au/glass-balustrade",
  },
  {
    externalid: "GO-PF-CLR",
    name: "Glass Pool Fencing Clear Panel",
    price: 19500,
    quantity: 1,
    category: "Glass Pool Fencing",
    sku: "PF-CLR",
    description: "Clear pool fencing panel",
    productUrl: "https://www.glassoutlet.com.au/glass-pool-fencing",
  },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function sumProducts(products) {
  return products.reduce((sum, p) => sum + p.price * p.quantity, 0);
}

async function findOrCreateConnection(ac) {
  const existing = await ac.get(
    `/connections?filters[externalid]=${encodeURIComponent(CONNECTION.externalid)}`
  );
  const match = existing.connections?.find(
    (c) => c.externalid === CONNECTION.externalid
  );
  if (match) {
    console.log(`Reusing connection id=${match.id} (${match.name})`);
    return match;
  }

  const created = await ac.post("/connections", { connection: CONNECTION });
  console.log(`Created connection id=${created.connection.id}`);
  return created.connection;
}

async function getContact(ac, contactId) {
  const data = await ac.get(`/contacts/${contactId}`);
  if (!data.contact) {
    throw new Error(`Contact ${contactId} not found`);
  }
  return data.contact;
}

async function findOrCreateCustomer(ac, { connectionId, contact }) {
  const email = contact.email;
  const externalid = `contact-${contact.id}`;

  const listed = await ac.get(
    `/ecomCustomers?filters[email]=${encodeURIComponent(email)}&filters[connectionid]=${connectionId}`
  );
  const existing = listed.ecomCustomers?.find(
    (c) => String(c.connectionid) === String(connectionId)
  );

  if (existing) {
    const updated = await ac.put(`/ecomCustomers/${existing.id}`, {
      ecomCustomer: {
        connectionid: String(connectionId),
        externalid,
        email,
        acceptsMarketing: "1",
      },
    });
    console.log(
      `Updated customer id=${updated.ecomCustomer.id} for contact ${contact.id} (${email})`
    );
    return updated.ecomCustomer;
  }

  const created = await ac.post("/ecomCustomers", {
    ecomCustomer: {
      connectionid: String(connectionId),
      externalid,
      email,
      acceptsMarketing: "1",
    },
  });
  console.log(
    `Created customer id=${created.ecomCustomer.id} for contact ${contact.id} (${email})`
  );
  return created.ecomCustomer;
}

async function createAbandonedCart(ac, { connectionId, customerId, email }) {
  const checkoutId = `cart-${Date.now()}`;
  const abandonedDate = isoMinutesAgo(45);
  const products = [SAMPLE_PRODUCTS[0]];
  const totalPrice = sumProducts(products);

  const payload = {
    ecomOrder: {
      // Abandoned cart: no externalid, use externalcheckoutid + abandonedDate
      externalid: null,
      externalcheckoutid: checkoutId,
      source: 1,
      email,
      orderProducts: products,
      totalPrice,
      shippingAmount: 0,
      taxAmount: 0,
      discountAmount: 0,
      currency: "AUD",
      connectionid: Number(connectionId),
      customerid: Number(customerId),
      orderUrl: `https://www.glassoutlet.com.au/cart/${checkoutId}`,
      externalCreatedDate: abandonedDate,
      abandonedDate,
    },
  };

  const created = await ac.post("/ecomOrders", payload);
  console.log(
    `Created abandoned cart id=${created.ecomOrder.id} checkout=${checkoutId}`
  );
  return created.ecomOrder;
}

async function createCompletedOrder(ac, { connectionId, customerId, email }) {
  const orderExternalId = `order-${Date.now()}`;
  const orderDate = isoMinutesAgo(10);
  const products = SAMPLE_PRODUCTS;
  const shippingAmount = 4500;
  const taxAmount = Math.round(sumProducts(products) * 0.1);
  const totalPrice = sumProducts(products) + shippingAmount + taxAmount;

  const payload = {
    ecomOrder: {
      externalid: orderExternalId,
      source: 1,
      email,
      orderProducts: products,
      orderUrl: `https://www.glassoutlet.com.au/orders/${orderExternalId}`,
      externalCreatedDate: orderDate,
      externalUpdatedDate: orderDate,
      shippingMethod: "Standard Delivery",
      totalPrice,
      shippingAmount,
      taxAmount,
      discountAmount: 0,
      currency: "AUD",
      orderNumber: orderExternalId,
      connectionid: Number(connectionId),
      customerid: Number(customerId),
    },
  };

  const created = await ac.post("/ecomOrders", payload);
  console.log(
    `Created completed order id=${created.ecomOrder.id} externalid=${orderExternalId}`
  );
  return created.ecomOrder;
}

async function main() {
  const ac = createAcClient({
    apiUrl: requireEnv("AC_API_URL"),
    apiToken: requireEnv("AC_API_TOKEN"),
  });

  console.log("=== Glass Outlet Deep Data sync ===\n");

  const connection = await findOrCreateConnection(ac);
  const contact = await getContact(ac, CONTACT_ID);
  console.log(`Loaded contact ${contact.id}: ${contact.email}`);

  const customer = await findOrCreateCustomer(ac, {
    connectionId: connection.id,
    contact,
  });

  const cart = await createAbandonedCart(ac, {
    connectionId: connection.id,
    customerId: customer.id,
    email: contact.email,
  });

  const order = await createCompletedOrder(ac, {
    connectionId: connection.id,
    customerId: customer.id,
    email: contact.email,
  });

  console.log("\n=== Done ===");
  console.log(
    JSON.stringify(
      {
        connectionId: connection.id,
        contactId: contact.id,
        customerId: customer.id,
        abandonedCartId: cart.id,
        orderId: order.id,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("\nSync failed:", err.message);
  if (err.data) {
    console.error(JSON.stringify(err.data, null, 2));
  }
  process.exit(1);
});
