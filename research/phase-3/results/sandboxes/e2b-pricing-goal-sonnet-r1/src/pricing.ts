/**
 * Order pricing module.
 *
 * Computes the total price of an order: item subtotal, discounts, VAT, and
 * currency-aware rounding. The public surface is `computePrice`, the
 * `PricingFacade`, and the option/type exports; everything else is internal
 * machinery.
 */

export interface OrderItem {
  name: string;
  unitPrice: number;
  quantity: number;
}

export type Currency = "GBP" | "EUR" | "USD";

export interface Order {
  items: OrderItem[];
  currency: Currency;
  loyaltyMember: boolean;
}

export interface PricingHooks {
  beforeStage?(stageName: string): void;
  afterStage?(stageName: string, runningTotal: number): void;
}

export interface PricingOptions {
  vatRate?: number;
  /** Only half-up rounding is implemented; the enum anticipates bankers'. */
  roundingMode?: "half-up";
  /** Reserved for localised price formatting. */
  locale?: string;
  /** Observability hooks invoked around every pipeline stage. */
  hooks?: PricingHooks;
}

const DEFAULT_VAT_RATE = 0.2;

// ---------------------------------------------------------------------------
// Discounts
// ---------------------------------------------------------------------------

/** Applied in order: bulk, then multi-line, then loyalty. */
const DISCOUNTS: { name: string; applies(order: Order): boolean; rate: number }[] = [
  {
    name: "bulk",
    applies: (order) =>
      order.items.reduce((total, item) => total + item.quantity, 0) >= 10,
    rate: 0.9,
  },
  {
    name: "multi-line",
    applies: (order) => new Set(order.items.map((item) => item.name)).size >= 3,
    rate: 0.98,
  },
  {
    name: "loyalty",
    applies: (order) => order.loyaltyMember,
    rate: 0.95,
  },
];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function runStage(
  hooks: PricingHooks,
  name: string,
  running: number,
  compute: () => number,
): number {
  hooks.beforeStage?.(name);
  const result = compute();
  hooks.afterStage?.(name, result);
  return result;
}

function price(order: Order, options?: PricingOptions): number {
  const vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
  const hooks = options?.hooks ?? {};

  let total = runStage(hooks, "subtotal", 0, () =>
    order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  total = runStage(hooks, "discount", total, () => {
    let discounted = total;
    for (const discount of DISCOUNTS) {
      if (discount.applies(order)) {
        discounted *= discount.rate;
      }
    }
    return discounted;
  });

  total = runStage(hooks, "tax", total, () => total * (1 + vatRate));

  total = runStage(hooks, "rounding", total, () => round(total));

  return total;
}

export class PricingFacade {
  constructor(private readonly options?: PricingOptions) {}

  price(order: Order): number {
    return price(order, this.options);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return price(order, options);
}
