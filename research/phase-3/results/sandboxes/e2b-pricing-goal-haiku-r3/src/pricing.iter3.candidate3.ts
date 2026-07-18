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

export function computePrice(order: Order, options?: PricingOptions): number {
  const { vatRate = 0.2, hooks = {} } = options ?? {};
  let amount = 0;

  hooks.beforeStage?.("subtotal");
  for (const { unitPrice, quantity } of order.items) {
    amount += unitPrice * quantity;
  }
  hooks.afterStage?.("subtotal", amount);

  hooks.beforeStage?.("discount");
  if (order.items.reduce((sum, i) => sum + i.quantity, 0) >= 10) amount *= 0.9;
  if (new Set(order.items.map(i => i.name)).size >= 3) amount *= 0.98;
  if (order.loyaltyMember) amount *= 0.95;
  hooks.afterStage?.("discount", amount);

  hooks.beforeStage?.("tax");
  amount *= 1 + vatRate;
  hooks.afterStage?.("tax", amount);

  hooks.beforeStage?.("rounding");
  amount = Math.round(amount * 100) / 100;
  hooks.afterStage?.("rounding", amount);

  return amount;
}

export class PricingFacade {
  constructor(private options?: PricingOptions) {}
  price(order: Order): number {
    return computePrice(order, this.options);
  }
}
