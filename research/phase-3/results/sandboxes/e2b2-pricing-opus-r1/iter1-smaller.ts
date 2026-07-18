/**
 * Order pricing module.
 *
 * Computes the total price of an order: item subtotal, discounts, VAT, and
 * rounding to two decimal places. The public surface is `computePrice`, the
 * `PricingFacade`, and the option/type exports; everything else is internal.
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
  roundingMode?: "half-up";
  locale?: string;
  hooks?: PricingHooks;
}

const DEFAULT_VAT_RATE = 0.2;

// ---------------------------------------------------------------------------
// Discounts. Order matters: bulk, then multi-line, then loyalty.
// ---------------------------------------------------------------------------

interface Discount {
  applies(order: Order): boolean;
  apply(subtotal: number): number;
}

const DISCOUNTS: Discount[] = [
  {
    // Bulk: 10% off when total quantity across all lines is 10 or more.
    applies: (order) =>
      order.items.reduce((sum, item) => sum + item.quantity, 0) >= 10,
    apply: (subtotal) => subtotal * 0.9,
  },
  {
    // Multi-line: 2% off when there are 3 or more distinct line names.
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
// Pipeline
// ---------------------------------------------------------------------------

function runStage(
  stageName: string,
  hooks: PricingHooks,
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

    running = runStage("subtotal", this.hooks, running, () =>
      order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    );

    running = runStage("discount", this.hooks, running, () => {
      let result = running;
      for (const discount of DISCOUNTS) {
        if (discount.applies(order)) {
          result = discount.apply(result);
        }
      }
      return result;
    });

    running = runStage(
      "tax",
      this.hooks,
      running,
      () => running * (1 + this.vatRate),
    );

    running = runStage("rounding", this.hooks, running, () =>
      Math.round(running * 100) / 100,
    );

    return running;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
