// Test suite for the pricing module. Run with: npx tsx --test <this file>
import { test } from "node:test";
import assert from "node:assert/strict";

import { computePrice, type Order } from "./pricing.ts";

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

test("applies the loyalty discount for members", () => {
  // 20; loyalty -5% -> 19; VAT -> 22.80
  const o = order({ loyaltyMember: true });
  assert.equal(computePrice(o), 22.8);
});

test("stacks bulk then loyalty discounts", () => {
  // 100; bulk -> 90; loyalty -> 85.5; VAT -> 102.60
  const o = order({
    items: [{ name: "widget", unitPrice: 10, quantity: 10 }],
    loyaltyMember: true,
  });
  assert.equal(computePrice(o), 102.6);
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

test("rounds to two decimal places in every currency", () => {
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
