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

/** Application order matters: bulk, then multi-line, then loyalty. */
function applyDiscounts(order: Order, amount: number): number {
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctLineNames = new Set(order.items.map((item) => item.name)).size;

  if (totalQuantity >= 10) amount *= 0.9;
  if (distinctLineNames >= 3) amount *= 0.98;
  if (order.loyaltyMember) amount *= 0.95;
  return amount;
}

function round(amount: number, currency: Currency): number {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
  return Math.round(amount * 100) / 100;
}

function runStage(hooks: PricingHooks, name: string, run: () => number): number {
  hooks.beforeStage?.(name);
  const amount = run();
  hooks.afterStage?.(name, amount);
  return amount;
}

function runPipeline(order: Order, vatRate: number, hooks: PricingHooks): number {
  const subtotal = runStage(hooks, "subtotal", () =>
    order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );
  const discounted = runStage(hooks, "discount", () => applyDiscounts(order, subtotal));
  const taxed = runStage(hooks, "tax", () => discounted * (1 + vatRate));
  return runStage(hooks, "rounding", () => round(taxed, order.currency));
}

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
