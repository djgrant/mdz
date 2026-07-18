// Test suite for the pricing module. Run with: npx tsx --test <this file>
import { test } from "node:test";
import assert from "node:assert/strict";

import { computePrice, PricingFacade, type Order } from "./pricing.ts";

function order(overrides: Partial<Order> = {}): Order {
  return {
    items: [{ name: "widget", unitPrice: 10, quantity: 2 }],
    currency: "GBP",
    loyaltyMember: false,
    ...overrides,
  };
}

test("prices a plain order: subtotal plus 20% VAT", () => {
  // 10 * 2 = 20; VAT 20% -> 24.00
  assert.equal(computePrice(order()), 24);
});

test("applies the bulk discount at 10 or more total units", () => {
  // 10 * 10 = 100; bulk -10% -> 90; VAT -> 108.00
  const o = order({ items: [{ name: "widget", unitPrice: 10, quantity: 10 }] });
  assert.equal(computePrice(o), 108);
});

test("does not apply the bulk discount below 10 total units", () => {
  // 10 * 9 = 90; VAT -> 108.00
  const o = order({ items: [{ name: "widget", unitPrice: 10, quantity: 9 }] });
  assert.equal(computePrice(o), 108);
});

test("bulk counts total units across lines", () => {
  // 10*6 + 5*4 = 80; qty 10 -> bulk -> 72; VAT -> 86.40
  const o = order({
    items: [
      { name: "widget", unitPrice: 10, quantity: 6 },
      { name: "gadget", unitPrice: 5, quantity: 4 },
    ],
  });
  assert.equal(computePrice(o), 86.4);
});

test("applies the loyalty discount for members", () => {
  // 20; loyalty -5% -> 19; VAT -> 22.80
  const o = order({ loyaltyMember: true });
  assert.equal(computePrice(o), 22.8);
});

test("applies the multi-line discount at 3 or more distinct lines", () => {
  // 10 + 5 + 5 = 20; multi-line -2% -> 19.6; VAT -> 23.52
  const o = order({
    items: [
      { name: "widget", unitPrice: 10, quantity: 1 },
      { name: "gadget", unitPrice: 5, quantity: 1 },
      { name: "gizmo", unitPrice: 5, quantity: 1 },
    ],
  });
  assert.equal(computePrice(o), 23.52);
});

test("counts distinct line names, not lines, for the multi-line discount", () => {
  // Two lines share a name: only 2 distinct -> no discount. 20; VAT -> 24.00
  const o = order({
    items: [
      { name: "widget", unitPrice: 10, quantity: 1 },
      { name: "widget", unitPrice: 5, quantity: 1 },
      { name: "gadget", unitPrice: 5, quantity: 1 },
    ],
  });
  assert.equal(computePrice(o), 24);
});

test("stacks bulk then loyalty discounts", () => {
  // 100; bulk -> 90; loyalty -> 85.5; VAT -> 102.60
  const o = order({
    items: [{ name: "widget", unitPrice: 10, quantity: 10 }],
    loyaltyMember: true,
  });
  assert.equal(computePrice(o), 102.6);
});

test("stacks all three discounts in order: bulk, multi-line, loyalty", () => {
  // 10*4 + 5*4 + 5*2 = 70; qty 10 -> bulk -> 63; multi-line -> 61.74;
  // loyalty -> 58.653; VAT -> 70.3836 -> 70.38
  const o = order({
    items: [
      { name: "widget", unitPrice: 10, quantity: 4 },
      { name: "gadget", unitPrice: 5, quantity: 4 },
      { name: "gizmo", unitPrice: 5, quantity: 2 },
    ],
    loyaltyMember: true,
  });
  assert.equal(computePrice(o), 70.38);
});

test("sums multiple line items", () => {
  // 10*2 + 5*3 = 35; VAT -> 42.00
  const o = order({
    items: [
      { name: "widget", unitPrice: 10, quantity: 2 },
      { name: "gadget", unitPrice: 5, quantity: 3 },
    ],
  });
  assert.equal(computePrice(o), 42);
});

test("honours a custom VAT rate", () => {
  // 20; VAT 5% -> 21.00
  assert.equal(new PricingFacade({ vatRate: 0.05 }).price(order()), 21);
  assert.equal(computePrice(order(), { vatRate: 0.05 }), 21);
});

test("rounds half-up to two decimal places in every currency", () => {
  // 3.33 * 1 = 3.33; VAT -> 3.996 -> 4.00
  for (const currency of ["GBP", "EUR", "USD"] as const) {
    const o = order({
      currency,
      items: [{ name: "widget", unitPrice: 3.33, quantity: 1 }],
    });
    assert.equal(computePrice(o), 4);
  }
});

test("prices an empty order at zero", () => {
  assert.equal(computePrice(order({ items: [] })), 0);
});
