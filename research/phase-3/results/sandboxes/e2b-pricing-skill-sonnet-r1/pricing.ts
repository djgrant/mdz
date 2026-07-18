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

// Discount multipliers, applied in order: bulk, then multi-line, then loyalty.
const BULK_THRESHOLD_UNITS = 10;
const BULK_DISCOUNT_MULTIPLIER = 0.9;
const MULTI_LINE_THRESHOLD = 3;
const MULTI_LINE_DISCOUNT_MULTIPLIER = 0.98;
const LOYALTY_DISCOUNT_MULTIPLIER = 0.95;

function totalUnits(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function distinctLineCount(items: OrderItem[]): number {
  return new Set(items.map((item) => item.name)).size;
}

function applyDiscounts(subtotal: number, order: Order): number {
  let total = subtotal;

  if (totalUnits(order.items) >= BULK_THRESHOLD_UNITS) {
    total *= BULK_DISCOUNT_MULTIPLIER;
  }

  if (distinctLineCount(order.items) >= MULTI_LINE_THRESHOLD) {
    total *= MULTI_LINE_DISCOUNT_MULTIPLIER;
  }

  if (order.loyaltyMember) {
    total *= LOYALTY_DISCOUNT_MULTIPLIER;
  }

  return total;
}

function computeSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function applyVat(total: number, vatRate: number): number {
  return total * (1 + vatRate);
}

function roundForCurrency(total: number, currency: Currency): number {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
  return Math.round(total * 100) / 100;
}

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    const subtotal = this.runStage("subtotal", () => computeSubtotal(order.items));
    const discounted = this.runStage("discount", () => applyDiscounts(subtotal, order));
    const taxed = this.runStage("tax", () => applyVat(discounted, this.vatRate));
    const rounded = this.runStage("rounding", () => roundForCurrency(taxed, order.currency));
    return rounded;
  }

  private runStage(name: string, run: () => number): number {
    this.hooks.beforeStage?.(name);
    const result = run();
    this.hooks.afterStage?.(name, result);
    return result;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
