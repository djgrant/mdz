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
//
// Applied in order: bulk, then multi-line, then loyalty.
// ---------------------------------------------------------------------------

function totalQuantity(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function distinctLineNames(order: Order): number {
  return new Set(order.items.map((item) => item.name)).size;
}

const DISCOUNTS: { applies(order: Order): boolean; factor: number }[] = [
  { applies: (order) => totalQuantity(order) >= 10, factor: 0.9 },
  { applies: (order) => distinctLineNames(order) >= 3, factor: 0.98 },
  { applies: (order) => order.loyaltyMember, factor: 0.95 },
];

function applyDiscounts(subtotal: number, order: Order): number {
  return DISCOUNTS.reduce(
    (amount, discount) =>
      discount.applies(order) ? amount * discount.factor : amount,
    subtotal,
  );
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

function runStage(
  hooks: PricingHooks,
  stageName: string,
  running: number,
  compute: () => number,
): number {
  hooks.beforeStage?.(stageName);
  const result = compute();
  hooks.afterStage?.(stageName, result);
  return result;
}

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    let running = 0;
    running = runStage(this.hooks, "subtotal", running, () =>
      order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    );
    running = runStage(this.hooks, "discount", running, () =>
      applyDiscounts(running, order),
    );
    running = runStage(
      this.hooks,
      "tax",
      running,
      () => running * (1 + this.vatRate),
    );
    running = runStage(this.hooks, "rounding", running, () =>
      Math.round(running * 100) / 100,
    );
    return running;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
