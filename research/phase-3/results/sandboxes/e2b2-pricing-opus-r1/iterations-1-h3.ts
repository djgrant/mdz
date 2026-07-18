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
// Discounts (bulk, multi-line, loyalty applied in that order)
// ---------------------------------------------------------------------------

function totalQuantity(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function distinctLineNames(order: Order): number {
  return new Set(order.items.map((item) => item.name)).size;
}

const DISCOUNTS: Array<{ applies(order: Order): boolean; factor: number }> = [
  { applies: (order) => totalQuantity(order) >= 10, factor: 0.9 }, // bulk
  { applies: (order) => distinctLineNames(order) >= 3, factor: 0.98 }, // multi-line
  { applies: (order) => order.loyaltyMember, factor: 0.95 }, // loyalty
];

function applyDiscounts(subtotal: number, order: Order): number {
  let result = subtotal;
  for (const discount of DISCOUNTS) {
    if (discount.applies(order)) {
      result *= discount.factor;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Rounding (half-up to two decimal places; identical for every currency,
// since currency conversion is always 1:1 in this pipeline)
// ---------------------------------------------------------------------------

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

const STAGES: Array<{
  name: string;
  run(total: number, order: Order, vatRate: number): number;
}> = [
  {
    name: "subtotal",
    run: (_total, order) =>
      order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  },
  {
    name: "discount",
    run: (total, order) => applyDiscounts(total, order),
  },
  {
    name: "tax",
    run: (total, _order, vatRate) => total * (1 + vatRate),
  },
  {
    name: "rounding",
    run: (total) => round(total),
  },
];

function runPipeline(
  order: Order,
  vatRate: number,
  hooks: PricingHooks,
): number {
  let running = 0;
  for (const stage of STAGES) {
    hooks.beforeStage?.(stage.name);
    running = stage.run(running, order, vatRate);
    hooks.afterStage?.(stage.name, running);
  }
  return running;
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
    return runPipeline(order, this.vatRate, this.hooks);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
