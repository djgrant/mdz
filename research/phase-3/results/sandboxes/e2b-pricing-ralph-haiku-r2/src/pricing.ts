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
  roundingMode?: "half-up";
  locale?: string;
  hooks?: PricingHooks;
}

const DEFAULT_OPTIONS = {
  vatRate: 0.2,
  roundingMode: "half-up" as const,
  locale: "en-GB",
};

function resolveOptions(options?: PricingOptions) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    hooks: options?.hooks ?? {},
  };
}

function roundHalfUp(value: number): number {
  return Math.round(value * 100) / 100;
}

function applyDiscounts(subtotal: number, order: Order): number {
  let factor = 1;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity >= 10) factor *= 0.9;
  if (new Set(order.items.map((item) => item.name)).size >= 3) factor *= 0.98;
  if (order.loyaltyMember) factor *= 0.95;
  return subtotal * factor;
}

export class PricingFacade {
  private options: ReturnType<typeof resolveOptions>;

  constructor(options?: PricingOptions) {
    this.options = resolveOptions(options);
  }

  price(order: Order): number {
    const { hooks } = this.options;

    hooks.beforeStage?.("subtotal");
    let total = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    hooks.afterStage?.("subtotal", total);

    hooks.beforeStage?.("discount");
    total = applyDiscounts(total, order);
    hooks.afterStage?.("discount", total);

    hooks.beforeStage?.("tax");
    total *= 1 + this.options.vatRate;
    hooks.afterStage?.("tax", total);

    hooks.beforeStage?.("rounding");
    total = roundHalfUp(total);
    hooks.afterStage?.("rounding", total);

    return total;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
