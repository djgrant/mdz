/**
 * Order pricing module.
 *
 * Computes the total price of an order: item subtotal, discounts, VAT, and
 * rounding. The public surface is `computePrice`, the `PricingFacade`, and
 * the option/type exports; everything else is internal machinery.
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
const DISCOUNTS: { applies(order: Order): boolean; apply(subtotal: number): number }[] = [
  {
    // Bulk: 10% off once total quantity across all lines reaches 10.
    applies: (order) => order.items.reduce((sum, item) => sum + item.quantity, 0) >= 10,
    apply: (subtotal) => subtotal * 0.9,
  },
  {
    // Multi-line: 2% off once the order has 3 or more distinct item names.
    applies: (order) => new Set(order.items.map((item) => item.name)).size >= 3,
    apply: (subtotal) => subtotal * 0.98,
  },
  {
    // Loyalty: 5% off for members.
    applies: (order) => order.loyaltyMember,
    apply: (subtotal) => subtotal * 0.95,
  },
];

// ---------------------------------------------------------------------------
// Pricing stages
// ---------------------------------------------------------------------------

function runStage(hooks: PricingHooks, stageName: string, compute: () => number): number {
  hooks.beforeStage?.(stageName);
  const result = compute();
  hooks.afterStage?.(stageName, result);
  return result;
}

function subtotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function applyDiscounts(order: Order, amount: number): number {
  let result = amount;
  for (const discount of DISCOUNTS) {
    if (discount.applies(order)) {
      result = discount.apply(result);
    }
  }
  return result;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    let running = runStage(this.hooks, "subtotal", () => subtotal(order));
    running = runStage(this.hooks, "discount", () => applyDiscounts(order, running));
    running = runStage(this.hooks, "tax", () => running * (1 + this.vatRate));
    running = runStage(this.hooks, "rounding", () => round(running));
    return running;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
