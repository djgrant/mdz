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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function stage(hooks: PricingHooks, name: string, run: () => number): number {
  hooks.beforeStage?.(name);
  const result = run();
  hooks.afterStage?.(name, result);
  return result;
}

/** Application order matters: bulk, then multi-line, then loyalty. */
function applyDiscounts(subtotal: number, order: Order): number {
  let result = subtotal;

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity >= 10) result *= 0.9;

  const distinctNames = new Set(order.items.map((item) => item.name));
  if (distinctNames.size >= 3) result *= 0.98;

  if (order.loyaltyMember) result *= 0.95;

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
    const subtotal = stage(this.hooks, "subtotal", () =>
      order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    );
    const discounted = stage(this.hooks, "discount", () => applyDiscounts(subtotal, order));
    const taxed = stage(this.hooks, "tax", () => discounted * (1 + this.vatRate));
    return stage(this.hooks, "rounding", () => {
      if (!SUPPORTED_CURRENCIES.includes(order.currency)) {
        throw new Error(`no rounding policy for currency: ${order.currency}`);
      }
      return round2(taxed);
    });
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
