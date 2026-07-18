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

// Discount thresholds and multipliers, named so the pipeline below reads as
// plain sentences instead of bare numbers.
const BULK_DISCOUNT_MIN_QUANTITY = 10;
const BULK_DISCOUNT_MULTIPLIER = 0.9; // 10% off
const MULTI_LINE_DISCOUNT_MIN_DISTINCT_ITEMS = 3;
const MULTI_LINE_DISCOUNT_MULTIPLIER = 0.98; // 2% off
const LOYALTY_DISCOUNT_MULTIPLIER = 0.95; // 5% off

function roundToNearestCent(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumSubtotal(items: OrderItem[]): number {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.unitPrice * item.quantity;
  }
  return subtotal;
}

function totalQuantity(items: OrderItem[]): number {
  let total = 0;
  for (const item of items) {
    total += item.quantity;
  }
  return total;
}

function countDistinctItemNames(items: OrderItem[]): number {
  return new Set(items.map((item) => item.name)).size;
}

/** Application order matters: bulk, then multi-line, then loyalty. */
function applyDiscounts(subtotal: number, order: Order): number {
  let result = subtotal;

  if (totalQuantity(order.items) >= BULK_DISCOUNT_MIN_QUANTITY) {
    result *= BULK_DISCOUNT_MULTIPLIER;
  }

  if (countDistinctItemNames(order.items) >= MULTI_LINE_DISCOUNT_MIN_DISTINCT_ITEMS) {
    result *= MULTI_LINE_DISCOUNT_MULTIPLIER;
  }

  if (order.loyaltyMember) {
    result *= LOYALTY_DISCOUNT_MULTIPLIER;
  }

  return result;
}

function runStage(hooks: PricingHooks, name: string, run: () => number): number {
  hooks.beforeStage?.(name);
  const result = run();
  hooks.afterStage?.(name, result);
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
    // The four pipeline steps, in the order they actually run:
    // 1. subtotal -> 2. discounts -> 3. VAT -> 4. currency-aware rounding.
    const subtotal = runStage(this.hooks, "subtotal", () => sumSubtotal(order.items));

    const discounted = runStage(this.hooks, "discount", () => applyDiscounts(subtotal, order));

    const taxed = runStage(this.hooks, "tax", () => discounted * (1 + this.vatRate));

    return runStage(this.hooks, "rounding", () => {
      if (!SUPPORTED_CURRENCIES.includes(order.currency)) {
        throw new Error(`no rounding policy for currency: ${order.currency}`);
      }
      return roundToNearestCent(taxed);
    });
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
