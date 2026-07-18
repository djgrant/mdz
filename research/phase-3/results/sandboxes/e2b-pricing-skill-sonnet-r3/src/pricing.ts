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

/** A single discount rule: does it apply, and what does it do to the subtotal? */
interface Discount {
  applies(order: Order): boolean;
  apply(subtotal: number): number;
}

/** Applied in this order: bulk, then multi-line, then loyalty. */
const DISCOUNTS: readonly Discount[] = [
  {
    // 10 or more units across the order.
    applies: (order) =>
      order.items.reduce((sum, item) => sum + item.quantity, 0) >= 10,
    apply: (subtotal) => subtotal * 0.9,
  },
  {
    // 3 or more distinct products.
    applies: (order) =>
      new Set(order.items.map((item) => item.name)).size >= 3,
    apply: (subtotal) => subtotal * 0.98,
  },
  {
    applies: (order) => order.loyaltyMember,
    apply: (subtotal) => subtotal * 0.95,
  },
];

/** GBP, EUR, and USD all round the same way: half-up to the nearest cent. */
function roundForCurrency(amount: number, currency: Currency): number {
  if (currency !== "GBP" && currency !== "EUR" && currency !== "USD") {
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
  return Math.round(amount * 100) / 100;
}

function computeSubtotal(order: Order): number {
  return order.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
}

function applyDiscounts(order: Order, subtotal: number): number {
  return DISCOUNTS.reduce(
    (amount, discount) =>
      discount.applies(order) ? discount.apply(amount) : amount,
    subtotal,
  );
}

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    const subtotal = this.runStage("subtotal", () => computeSubtotal(order));
    const discounted = this.runStage("discount", () =>
      applyDiscounts(order, subtotal),
    );
    const taxed = this.runStage(
      "tax",
      () => discounted * (1 + this.vatRate),
    );
    const rounded = this.runStage("rounding", () =>
      roundForCurrency(taxed, order.currency),
    );
    return rounded;
  }

  /** Runs one pipeline stage, firing the before/after observability hooks. */
  private runStage(name: string, compute: () => number): number {
    this.hooks.beforeStage?.(name);
    const result = compute();
    this.hooks.afterStage?.(name, result);
    return result;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
