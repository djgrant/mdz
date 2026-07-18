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
  let total = 0;
  for (const item of order.items) {
    total += item.unitPrice * item.quantity;
  }
  return total;
}

function applyDiscounts(subtotal: number, order: Order): number {
  let result = subtotal;

  // Bulk discount: 10+ items = 10% off
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity >= 10) {
    result *= 0.9;
  }

  // Multi-line discount: 3+ distinct items = 2% off
  const distinctNames = new Set(order.items.map(item => item.name));
  if (distinctNames.size >= 3) {
    result *= 0.98;
  }

  // Loyalty discount: loyalty members = 5% off
  if (order.loyaltyMember) {
    result *= 0.95;
  }

  return result;
}

function applyTax(amount: number, vatRate: number): number {
  return amount * (1 + vatRate);
}

function roundAmount(amount: number): number {
  const cents = Math.round(amount * 100);
  return cents / 100;
}

function runStage(
  stageName: string,
  amount: number,
  operation: (amount: number) => number,
  hooks: PricingHooks,
): number {
  hooks.beforeStage?.(stageName);
  const result = operation(amount);
  hooks.afterStage?.(stageName, result);
  return result;
}

function computeOrderPrice(
  order: Order,
  options: ResolvedPricingOptions,
): number {
  let amount = 0;

  amount = runStage("subtotal", amount, () => computeSubtotal(order), options.hooks);
  amount = runStage("discount", amount, (a) => applyDiscounts(a, order), options.hooks);
  amount = runStage("tax", amount, (a) => applyTax(a, options.vatRate), options.hooks);
  amount = runStage("rounding", amount, roundAmount, options.hooks);

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
