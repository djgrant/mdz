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

export function computePrice(order: Order, options?: PricingOptions): number {
  const vatRate = options?.vatRate ?? 0.2;
  const hooks = options?.hooks ?? {};

  const run = (name: string, fn: () => number) => {
    hooks.beforeStage?.(name);
    const result = fn();
    hooks.afterStage?.(name, result);
    return result;
  };

  // Subtotal
  let amount = run("subtotal", () => {
    let total = 0;
    for (const item of order.items) {
      total += item.unitPrice * item.quantity;
    }
    return total;
  });

  // Discounts
  amount = run("discount", () => {
    let qty = 0;
    for (const item of order.items) qty += item.quantity;
    if (qty >= 10) amount *= 0.9;
    if (new Set(order.items.map(item => item.name)).size >= 3) amount *= 0.98;
    if (order.loyaltyMember) amount *= 0.95;
    return amount;
  });

  // Tax
  amount = run("tax", () => amount * (1 + vatRate));

  // Rounding
  amount = run("rounding", () => Math.round(amount * 100) / 100);

  return amount;
}

export class PricingFacade {
  constructor(private options?: PricingOptions) {}
  price(order: Order): number {
    return computePrice(order, this.options);
  }
}
