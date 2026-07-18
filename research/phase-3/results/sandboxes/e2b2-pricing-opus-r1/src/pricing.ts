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
const SUPPORTED_CURRENCIES: readonly Currency[] = ["GBP", "EUR", "USD"];

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  private stage(name: string, run: () => number): number {
    this.hooks.beforeStage?.(name);
    const result = run();
    this.hooks.afterStage?.(name, result);
    return result;
  }

  price(order: Order): number {
    const subtotal = this.stage("subtotal", () =>
      order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    );

    const discounted = this.stage("discount", () => {
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const distinctNames = new Set(order.items.map((item) => item.name)).size;
      let result = subtotal;
      if (totalQuantity >= 10) result *= 0.9;
      if (distinctNames >= 3) result *= 0.98;
      if (order.loyaltyMember) result *= 0.95;
      return result;
    });

    const taxed = this.stage("tax", () => discounted * (1 + this.vatRate));

    return this.stage("rounding", () => {
      if (!SUPPORTED_CURRENCIES.includes(order.currency)) {
        throw new Error(`no rounding policy for currency: ${order.currency}`);
      }
      return Math.round(taxed * 100) / 100;
    });
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
