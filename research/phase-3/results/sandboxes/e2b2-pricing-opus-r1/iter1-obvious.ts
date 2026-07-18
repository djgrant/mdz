/**
 * Order pricing module.
 *
 * Computes the total price of an order by running it through a fixed
 * pipeline of stages: subtotal, discount, tax, rounding.
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
const DEFAULT_LOCALE = "en-GB";

// ---------------------------------------------------------------------------
// Discount rules, in the order they are applied
// ---------------------------------------------------------------------------
//   1. bulk:       10+ items in the order            -> 10% off
//   2. multi-line: 3+ distinct product names          -> 2% off
//   3. loyalty:    order placed by a loyalty member    -> 5% off
// Each discount that applies is applied in turn to the running subtotal.
// ---------------------------------------------------------------------------

interface DiscountRule {
  readonly name: string;
  applies(order: Order): boolean;
  apply(subtotal: number): number;
}

const bulkDiscount: DiscountRule = {
  name: "bulk",
  applies: (order) =>
    order.items.reduce((total, item) => total + item.quantity, 0) >= 10,
  apply: (subtotal) => subtotal * 0.9,
};

const multiLineDiscount: DiscountRule = {
  name: "multi-line",
  applies: (order) => new Set(order.items.map((item) => item.name)).size >= 3,
  apply: (subtotal) => subtotal * 0.98,
};

const loyaltyDiscount: DiscountRule = {
  name: "loyalty",
  applies: (order) => order.loyaltyMember,
  apply: (subtotal) => subtotal * 0.95,
};

const DISCOUNT_RULES: readonly DiscountRule[] = [
  bulkDiscount,
  multiLineDiscount,
  loyaltyDiscount,
];

// ---------------------------------------------------------------------------
// Rounding, per currency (all half-up to 2 decimal places today)
// ---------------------------------------------------------------------------

const ROUNDERS: Record<Currency, (value: number) => number> = {
  GBP: (value) => Math.round(value * 100) / 100,
  EUR: (value) => Math.round(value * 100) / 100,
  USD: (value) => Math.round(value * 100) / 100,
};

function round(value: number, currency: Currency): number {
  return ROUNDERS[currency](value);
}

// ---------------------------------------------------------------------------
// Pipeline stages
//   subtotal -> discount -> tax -> rounding
// Each stage takes the running total and returns the next running total.
// Hooks (if provided) fire immediately before and after each stage.
// ---------------------------------------------------------------------------

function subtotalStage(order: Order): number {
  return order.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
}

function discountStage(runningTotal: number, order: Order): number {
  let result = runningTotal;
  for (const rule of DISCOUNT_RULES) {
    if (rule.applies(order)) {
      result = rule.apply(result);
    }
  }
  return result;
}

function taxStage(runningTotal: number, vatRate: number): number {
  return runningTotal * (1 + vatRate);
}

function roundingStage(runningTotal: number, currency: Currency): number {
  return round(runningTotal, currency);
}

interface ResolvedOptions {
  vatRate: number;
  roundingMode: "half-up";
  locale: string;
  hooks: PricingHooks;
}

function resolveOptions(options?: PricingOptions): ResolvedOptions {
  return {
    vatRate: options?.vatRate ?? DEFAULT_VAT_RATE,
    roundingMode: options?.roundingMode ?? "half-up",
    locale: options?.locale ?? DEFAULT_LOCALE,
    hooks: options?.hooks ?? {},
  };
}

function runPipeline(order: Order, options: ResolvedOptions): number {
  const { hooks } = options;
  let running = 0;

  const stages: Array<[string, () => number]> = [
    ["subtotal", () => subtotalStage(order)],
    ["discount", () => discountStage(running, order)],
    ["tax", () => taxStage(running, options.vatRate)],
    ["rounding", () => roundingStage(running, order.currency)],
  ];

  for (const [stageName, run] of stages) {
    hooks.beforeStage?.(stageName);
    running = run();
    hooks.afterStage?.(stageName, running);
  }

  return running;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export class PricingFacade {
  private readonly options: ResolvedOptions;

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
