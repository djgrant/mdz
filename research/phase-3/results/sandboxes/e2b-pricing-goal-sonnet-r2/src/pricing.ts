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
  /** Only half-up rounding is implemented; the enum anticipates bankers'. */
  roundingMode?: "half-up";
  /** Reserved for localised price formatting. */
  locale?: string;
  /** Observability hooks invoked around every pipeline stage. */
  hooks?: PricingHooks;
}

const DEFAULT_VAT_RATE = 0.2;

// Stages run in this order: subtotal, discount, tax, rounding. Discounts
// stack in this order too: bulk, then multi-line, then loyalty.
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
    run: (total, order) => {
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const distinctNames = new Set(order.items.map((item) => item.name)).size;

      if (totalQuantity >= 10) total *= 0.9;
      if (distinctNames >= 3) total *= 0.98;
      if (order.loyaltyMember) total *= 0.95;
      return total;
    },
  },
  {
    name: "tax",
    run: (total, _order, vatRate) => total * (1 + vatRate),
  },
  {
    name: "rounding",
    run: (total) => Math.round(total * 100) / 100,
  },
];

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    let running = 0;
    for (const stage of STAGES) {
      this.hooks.beforeStage?.(stage.name);
      running = stage.run(running, order, this.vatRate);
      this.hooks.afterStage?.(stage.name, running);
    }
    return running;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
