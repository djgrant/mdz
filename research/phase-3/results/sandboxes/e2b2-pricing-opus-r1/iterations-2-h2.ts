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

const BULK_DISCOUNT_MIN_QUANTITY = 10;
const BULK_DISCOUNT_MULTIPLIER = 0.9;

const MULTI_LINE_DISCOUNT_MIN_DISTINCT_NAMES = 3;
const MULTI_LINE_DISCOUNT_MULTIPLIER = 0.98;

const LOYALTY_DISCOUNT_MULTIPLIER = 0.95;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumSubtotal(items: OrderItem[]): number {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.unitPrice * item.quantity;
  }
  return subtotal;
}

function countDistinctNames(items: OrderItem[]): number {
  const names = new Set<string>();
  for (const item of items) {
    names.add(item.name);
  }
  return names.size;
}

function sumQuantity(items: OrderItem[]): number {
  let total = 0;
  for (const item of items) {
    total += item.quantity;
  }
  return total;
}

/** Application order matters: bulk, then multi-line, then loyalty. */
function applyDiscounts(subtotal: number, order: Order): number {
  let result = subtotal;

  if (sumQuantity(order.items) >= BULK_DISCOUNT_MIN_QUANTITY) {
    result *= BULK_DISCOUNT_MULTIPLIER;
  }

  if (countDistinctNames(order.items) >= MULTI_LINE_DISCOUNT_MIN_DISTINCT_NAMES) {
    result *= MULTI_LINE_DISCOUNT_MULTIPLIER;
  }

  if (order.loyaltyMember) {
    result *= LOYALTY_DISCOUNT_MULTIPLIER;
  }

  return result;
}

function applyVat(amount: number, vatRate: number): number {
  return amount * (1 + vatRate);
}

function roundForCurrency(amount: number, currency: Currency): number {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
  return round2(amount);
}

function runStages(order: Order, vatRate: number, hooks: PricingHooks): number {
  hooks.beforeStage?.("subtotal");
  const subtotal = sumSubtotal(order.items);
  hooks.afterStage?.("subtotal", subtotal);

  hooks.beforeStage?.("discount");
  const discounted = applyDiscounts(subtotal, order);
  hooks.afterStage?.("discount", discounted);

  hooks.beforeStage?.("tax");
  const taxed = applyVat(discounted, vatRate);
  hooks.afterStage?.("tax", taxed);

  hooks.beforeStage?.("rounding");
  const rounded = roundForCurrency(taxed, order.currency);
  hooks.afterStage?.("rounding", rounded);

  return rounded;
}

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    return runStages(order, this.vatRate, this.hooks);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
