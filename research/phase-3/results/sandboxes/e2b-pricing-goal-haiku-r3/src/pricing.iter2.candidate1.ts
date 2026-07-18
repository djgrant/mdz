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

export function computePrice(order: Order, options?: PricingOptions): number {
  const vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
  const hooks = options?.hooks ?? {};

  // Subtotal
  if (hooks.beforeStage) hooks.beforeStage("subtotal");
  let amount = 0;
  for (const item of order.items) {
    amount += item.unitPrice * item.quantity;
  }
  if (hooks.afterStage) hooks.afterStage("subtotal", amount);

  // Discounts: bulk, multi-line, loyalty
  if (hooks.beforeStage) hooks.beforeStage("discount");
  let totalQuantity = 0;
  for (const item of order.items) {
    totalQuantity += item.quantity;
  }
  if (totalQuantity >= 10) {
    amount *= 0.9;
  }
  const distinctLines = new Set(order.items.map(item => item.name));
  if (distinctLines.size >= 3) {
    amount *= 0.98;
  }
  if (order.loyaltyMember) {
    amount *= 0.95;
  }
  if (hooks.afterStage) hooks.afterStage("discount", amount);

  // Tax
  if (hooks.beforeStage) hooks.beforeStage("tax");
  amount *= 1 + vatRate;
  if (hooks.afterStage) hooks.afterStage("tax", amount);

  // Rounding
  if (hooks.beforeStage) hooks.beforeStage("rounding");
  amount = Math.round(amount * 100) / 100;
  if (hooks.afterStage) hooks.afterStage("rounding", amount);

  return amount;
}

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    return computePrice(order, {
      vatRate: this.vatRate,
      hooks: this.hooks,
    });
  }
}
