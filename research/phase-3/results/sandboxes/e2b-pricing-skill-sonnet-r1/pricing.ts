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

// ---------------------------------------------------------------------------
// Discounts
//
// Applied in order: bulk, then multi-line, then loyalty.
// ---------------------------------------------------------------------------

function totalQuantity(order: Order): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function distinctItemCount(order: Order): number {
  return new Set(order.items.map((item) => item.name)).size;
}

function applyDiscounts(order: Order, subtotal: number): number {
  let total = subtotal;

  if (totalQuantity(order) >= 10) {
    total *= 0.9; // bulk
  }
  if (distinctItemCount(order) >= 3) {
    total *= 0.98; // multi-line
  }
  if (order.loyaltyMember) {
    total *= 0.95; // loyalty
  }

  return total;
}

// ---------------------------------------------------------------------------
// Rounding
//
// Every supported currency rounds the same way (half-up to the nearest
// cent/penny); the check exists so a currency with different rounding rules
// can be added without silently mispricing it.
// ---------------------------------------------------------------------------

function roundToCurrency(amount: number, currency: Currency): number {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
  return Math.round(amount * 100) / 100;
}

// ---------------------------------------------------------------------------
// Pipeline
//
// Each stage is announced to the hooks before it runs and reports the
// resulting total after.
// ---------------------------------------------------------------------------

function computeSubtotal(order: Order): number {
  return order.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

function applyVat(subtotal: number, vatRate: number): number {
  return subtotal * (1 + vatRate);
}

function runStage(hooks: PricingHooks, name: string, compute: () => number): number {
  hooks.beforeStage?.(name);
  const result = compute();
  hooks.afterStage?.(name, result);
  return result;
}

function runPipeline(order: Order, vatRate: number, hooks: PricingHooks): number {
  const subtotal = runStage(hooks, "subtotal", () => computeSubtotal(order));
  const discounted = runStage(hooks, "discount", () => applyDiscounts(order, subtotal));
  const taxed = runStage(hooks, "tax", () => applyVat(discounted, vatRate));
  return runStage(hooks, "rounding", () => roundToCurrency(taxed, order.currency));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    return runPipeline(order, this.vatRate, this.hooks);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
