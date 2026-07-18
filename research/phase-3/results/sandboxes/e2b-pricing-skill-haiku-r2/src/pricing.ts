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
  roundingMode?: "half-up";
  locale?: string;
  hooks?: PricingHooks;
}

function applyDiscounts(subtotal: number, order: Order): number {
  let multiplier = 1;

  // Bulk discount: 10+ items
  if (order.items.reduce((sum, item) => sum + item.quantity, 0) >= 10) {
    multiplier *= 0.9;
  }

  // Multi-line discount: 3+ different items
  if (new Set(order.items.map((item) => item.name)).size >= 3) {
    multiplier *= 0.98;
  }

  // Loyalty discount
  if (order.loyaltyMember) {
    multiplier *= 0.95;
  }

  return subtotal * multiplier;
}

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? 0.2;
    this.hooks = options?.hooks ?? {};
  }

  private stage(name: string, compute: () => number): number {
    this.hooks.beforeStage?.(name);
    const amount = compute();
    this.hooks.afterStage?.(name, amount);
    return amount;
  }

  price(order: Order): number {
    let amount = this.stage("subtotal", () =>
      order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    );

    amount = this.stage("discount", () => applyDiscounts(amount, order));

    amount = this.stage("tax", () => amount * (1 + this.vatRate));

    amount = this.stage("rounding", () => Math.round(amount * 100) / 100);

    return amount;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
