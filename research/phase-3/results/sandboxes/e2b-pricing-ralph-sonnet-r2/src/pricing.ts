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

const STAGES = ["subtotal", "discount", "tax", "rounding"] as const;

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    const run = (stage: (typeof STAGES)[number], total: number): number => {
      this.hooks.beforeStage?.(stage);
      this.hooks.afterStage?.(stage, total);
      return total;
    };

    const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const distinctLines = new Set(order.items.map((item) => item.name)).size;

    let total = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    total = run("subtotal", total);

    if (totalUnits >= 10) total *= 0.9;
    if (distinctLines >= 3) total *= 0.98;
    if (order.loyaltyMember) total *= 0.95;
    total = run("discount", total);

    total = run("tax", total * (1 + this.vatRate));

    return run("rounding", Math.round(total * 100) / 100);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
