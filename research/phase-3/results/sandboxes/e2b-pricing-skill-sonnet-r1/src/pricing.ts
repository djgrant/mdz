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
// Discounts. Applied in order: bulk, then multi-line, then loyalty.
// ---------------------------------------------------------------------------

function applyDiscounts(subtotal: number, order: Order): number {
  let total = subtotal;

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity >= 10) {
    total *= 0.9;
  }

  const distinctLineNames = new Set(order.items.map((item) => item.name));
  if (distinctLineNames.size >= 3) {
    total *= 0.98;
  }

  if (order.loyaltyMember) {
    total *= 0.95;
  }

  return total;
}

// ---------------------------------------------------------------------------
// Rounding. GBP, EUR, and USD all round half-up to two decimal places today;
// the per-currency lookup exists so a currency with different minor units
// can be added without touching the pipeline.
// ---------------------------------------------------------------------------

const ROUNDING_POLICIES: Record<Currency, (value: number) => number> = {
  GBP: (value) => Math.round(value * 100) / 100,
  EUR: (value) => Math.round(value * 100) / 100,
  USD: (value) => Math.round(value * 100) / 100,
};

function round(currency: Currency, value: number): number {
  const policy = ROUNDING_POLICIES[currency];
  if (!policy) {
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
  return policy(value);
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function runStage(
  hooks: PricingHooks,
  stageName: string,
  compute: () => number,
): number {
  hooks.beforeStage?.(stageName);
  const runningTotal = compute();
  hooks.afterStage?.(stageName, runningTotal);
  return runningTotal;
}

function runPipeline(
  order: Order,
  options: ReturnType<typeof resolveOptions>,
): number {
  const { hooks } = options;

  let total = runStage(hooks, "subtotal", () =>
    order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  total = runStage(hooks, "discount", () => applyDiscounts(total, order));

  total = runStage(hooks, "tax", () => total * (1 + options.vatRate));

  total = runStage(hooks, "rounding", () => round(order.currency, total));

  return total;
}

// ---------------------------------------------------------------------------
// Public API
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
