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

// ---------------------------------------------------------------------------
// Pricing options
// ---------------------------------------------------------------------------

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

const DEFAULT_PRICING_OPTIONS: Required<Omit<PricingOptions, "hooks">> = {
  vatRate: 0.2,
  roundingMode: "half-up",
  locale: "en-GB",
};

function resolveOptions(
  options?: PricingOptions,
): Required<Omit<PricingOptions, "hooks">> & { hooks: PricingHooks } {
  return {
    ...DEFAULT_PRICING_OPTIONS,
    ...(options ?? {}),
    hooks: options?.hooks ?? {},
  };
}

// ---------------------------------------------------------------------------
// Discount logic
// ---------------------------------------------------------------------------

function subtotalPrice(order: Order): number {
  let total = 0;
  for (const item of order.items) {
    total += item.unitPrice * item.quantity;
  }
  return total;
}

function applyDiscounts(subtotal: number, order: Order): number {
  let result = subtotal;

  // Bulk discount: 10+ items -> -10%
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity >= 10) {
    result *= 0.9;
  }

  // Multi-line discount: 3+ distinct product names -> -2%
  const distinctLines = new Set(order.items.map(item => item.name));
  if (distinctLines.size >= 3) {
    result *= 0.98;
  }

  // Loyalty discount: loyalty member -> -5%
  if (order.loyaltyMember) {
    result *= 0.95;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Pricing calculation
// ---------------------------------------------------------------------------

function computePriceInternal(
  order: Order,
  options: Required<Omit<PricingOptions, "hooks">> & { hooks: PricingHooks },
): number {
  const hooks = options.hooks;

  // Subtotal
  if (hooks.beforeStage) hooks.beforeStage("subtotal");
  let amount = subtotalPrice(order);
  if (hooks.afterStage) hooks.afterStage("subtotal", amount);

  // Discount
  if (hooks.beforeStage) hooks.beforeStage("discount");
  amount = applyDiscounts(amount, order);
  if (hooks.afterStage) hooks.afterStage("discount", amount);

  // Tax
  if (hooks.beforeStage) hooks.beforeStage("tax");
  amount *= 1 + options.vatRate;
  if (hooks.afterStage) hooks.afterStage("tax", amount);

  // Rounding
  if (hooks.beforeStage) hooks.beforeStage("rounding");
  amount = Math.round(amount * 100) / 100;
  if (hooks.afterStage) hooks.afterStage("rounding", amount);

  return amount;
}

// ---------------------------------------------------------------------------
// Factory and facade
// ---------------------------------------------------------------------------

export class PricingFacade {
  private readonly options: Required<Omit<PricingOptions, "hooks">> & { hooks: PricingHooks };

  constructor(options?: PricingOptions) {
    this.options = resolveOptions(options);
  }

  price(order: Order): number {
    return computePriceInternal(order, this.options);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
