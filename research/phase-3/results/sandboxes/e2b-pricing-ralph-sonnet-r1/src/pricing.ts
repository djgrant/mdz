/**
 * Order pricing module.
 *
 * Computes the total price of an order: item subtotal, discounts, VAT, and
 * rounding. The public surface is `computePrice`, the `PricingFacade`, and
 * the option/type exports; everything else is internal machinery.
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

function subtotal(order: Order): number {
  return order.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
}

/** Applied in order: bulk (10+ units), then multi-line (3+ distinct items), then loyalty. */
function applyDiscounts(order: Order, amount: number): number {
  const totalUnits = order.items.reduce((total, item) => total + item.quantity, 0);
  const distinctItems = new Set(order.items.map((item) => item.name)).size;

  if (totalUnits >= 10) amount *= 0.9;
  if (distinctItems >= 3) amount *= 0.98;
  if (order.loyaltyMember) amount *= 0.95;

  return amount;
}

function round(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    const stages: Array<[string, (amount: number) => number]> = [
      ["subtotal", () => subtotal(order)],
      ["discount", (amount) => applyDiscounts(order, amount)],
      ["tax", (amount) => amount * (1 + this.vatRate)],
      ["rounding", round],
    ];

    let amount = 0;
    for (const [name, run] of stages) {
      this.hooks.beforeStage?.(name);
      amount = run(amount);
      this.hooks.afterStage?.(name, amount);
    }
    return amount;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
