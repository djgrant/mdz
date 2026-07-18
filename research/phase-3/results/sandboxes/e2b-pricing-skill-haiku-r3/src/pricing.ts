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

const DEFAULT_PRICING_OPTIONS = {
  vatRate: 0.2,
  roundingMode: "half-up" as const,
  locale: "en-GB",
};

interface ResolvedPricingOptions {
  vatRate: number;
  roundingMode: "half-up";
  locale: string;
  hooks: PricingHooks;
}

function resolveOptions(options?: PricingOptions): ResolvedPricingOptions {
  return {
    vatRate: options?.vatRate ?? DEFAULT_PRICING_OPTIONS.vatRate,
    roundingMode: options?.roundingMode ?? DEFAULT_PRICING_OPTIONS.roundingMode,
    locale: options?.locale ?? DEFAULT_PRICING_OPTIONS.locale,
    hooks: options?.hooks ?? {},
  };
}

function computeSubtotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function applyDiscounts(subtotal: number, order: Order): number {
  let discountMultiplier = 1;

  // Bulk discount: 10+ items = 10% off
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity >= 10) {
    discountMultiplier *= 0.9;
  }

  // Multi-line discount: 3+ distinct items = 2% off
  const distinctNames = new Set(order.items.map(item => item.name));
  if (distinctNames.size >= 3) {
    discountMultiplier *= 0.98;
  }

  // Loyalty discount: loyalty members = 5% off
  if (order.loyaltyMember) {
    discountMultiplier *= 0.95;
  }

  return subtotal * discountMultiplier;
}

function applyTax(amount: number, vatRate: number): number {
  return amount * (1 + vatRate);
}

function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function computeOrderPrice(
  order: Order,
  options: ResolvedPricingOptions,
): number {
  const hooks = options.hooks;
  let amount = 0;

  // Subtotal
  hooks.beforeStage?.("subtotal");
  amount = computeSubtotal(order);
  hooks.afterStage?.("subtotal", amount);

  // Discount
  hooks.beforeStage?.("discount");
  amount = applyDiscounts(amount, order);
  hooks.afterStage?.("discount", amount);

  // Tax
  hooks.beforeStage?.("tax");
  amount = applyTax(amount, options.vatRate);
  hooks.afterStage?.("tax", amount);

  // Rounding
  hooks.beforeStage?.("rounding");
  amount = roundAmount(amount);
  hooks.afterStage?.("rounding", amount);

  return amount;
}

export class PricingFacade {
  private readonly options: ResolvedPricingOptions;

  constructor(options?: PricingOptions) {
    this.options = resolveOptions(options);
  }

  price(order: Order): number {
    return computeOrderPrice(order, this.options);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
