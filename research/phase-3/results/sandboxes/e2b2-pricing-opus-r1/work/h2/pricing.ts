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

const DEFAULT_VAT_RATE = 0.2;
const DEFAULT_ROUNDING_MODE = "half-up";
const DEFAULT_LOCALE = "en-GB";

function resolveOptions(options?: PricingOptions) {
  return {
    vatRate: options?.vatRate ?? DEFAULT_VAT_RATE,
    roundingMode: options?.roundingMode ?? DEFAULT_ROUNDING_MODE,
    locale: options?.locale ?? DEFAULT_LOCALE,
    hooks: options?.hooks ?? {},
  };
}

// ---------------------------------------------------------------------------
// Pricing stages
//
// Each stage is a plain function: (order, options, runningTotal) -> total.
// They run in this fixed order: subtotal, discount, tax, rounding.
// Discounts within the discount stage also apply in a fixed order:
// bulk, then multi-line, then loyalty — stacking on top of each other.
// ---------------------------------------------------------------------------

function computeSubtotal(order: Order): number {
  let subtotal = 0;
  for (const item of order.items) {
    subtotal += item.unitPrice * item.quantity;
  }
  return subtotal;
}

/** 10% off when the order contains 10 or more units in total. */
function applyBulkDiscount(order: Order, amount: number): number {
  let totalQuantity = 0;
  for (const item of order.items) {
    totalQuantity += item.quantity;
  }
  return totalQuantity >= 10 ? amount * 0.9 : amount;
}

/** 2% off when the order has 3 or more distinctly-named line items. */
function applyMultiLineDiscount(order: Order, amount: number): number {
  const distinctNames = new Set(order.items.map((item) => item.name));
  return distinctNames.size >= 3 ? amount * 0.98 : amount;
}

/** 5% off for loyalty members. */
function applyLoyaltyDiscount(order: Order, amount: number): number {
  return order.loyaltyMember ? amount * 0.95 : amount;
}

function applyDiscounts(order: Order, subtotal: number): number {
  let amount = subtotal;
  amount = applyBulkDiscount(order, amount);
  amount = applyMultiLineDiscount(order, amount);
  amount = applyLoyaltyDiscount(order, amount);
  return amount;
}

function applyTax(amount: number, vatRate: number): number {
  return amount * (1 + vatRate);
}

/** Half-up rounding to two decimal places; identical for every currency. */
function roundToCurrency(amount: number, _currency: Currency): number {
  return Math.round(amount * 100) / 100;
}

const STAGES: Array<{
  name: string;
  run(order: Order, options: ReturnType<typeof resolveOptions>, amount: number): number;
}> = [
  { name: "subtotal", run: (order) => computeSubtotal(order) },
  { name: "discount", run: (order, _options, amount) => applyDiscounts(order, amount) },
  { name: "tax", run: (_order, options, amount) => applyTax(amount, options.vatRate) },
  { name: "rounding", run: (order, _options, amount) => roundToCurrency(amount, order.currency) },
];

function runPipeline(order: Order, options: ReturnType<typeof resolveOptions>): number {
  let amount = 0;
  for (const stage of STAGES) {
    options.hooks.beforeStage?.(stage.name);
    amount = stage.run(order, options, amount);
    options.hooks.afterStage?.(stage.name, amount);
  }
  return amount;
}

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------

export class PricingFacade {
  private readonly options: ReturnType<typeof resolveOptions>;

  constructor(options?: PricingOptions) {
    this.options = resolveOptions(options);
  }

  price(order: Order): number {
    return runPipeline(order, this.options);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
