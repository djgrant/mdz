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
const DEFAULT_ROUNDING_MODE = "half-up";
const DEFAULT_LOCALE = "en-GB";

const VALID_CURRENCIES: readonly Currency[] = ["GBP", "EUR", "USD"];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Application order matters: bulk, then multi-line, then loyalty. */
function applyDiscounts(subtotal: number, order: Order): number {
  let result = subtotal;

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity >= 10) {
    result *= 0.9;
  }

  const distinctLineNames = new Set(order.items.map((item) => item.name));
  if (distinctLineNames.size >= 3) {
    result *= 0.98;
  }

  if (order.loyaltyMember) {
    result *= 0.95;
  }

  return result;
}

function runPipeline(order: Order, options: Required<Omit<PricingOptions, "hooks">> & { hooks: PricingHooks }): number {
  const { hooks } = options;
  let running = 0;

  const stage = (stageName: string, compute: () => number): void => {
    hooks.beforeStage?.(stageName);
    running = compute();
    hooks.afterStage?.(stageName, running);
  };

  stage("subtotal", () =>
    order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );
  stage("discount", () => applyDiscounts(running, order));
  stage("tax", () => running * (1 + options.vatRate));
  stage("rounding", () => {
    if (!VALID_CURRENCIES.includes(order.currency)) {
      throw new Error(`no rounding policy for currency: ${order.currency}`);
    }
    return round(running);
  });

  return running;
}

export class PricingFacade {
  private readonly options: Required<Omit<PricingOptions, "hooks">> & { hooks: PricingHooks };

  constructor(options?: PricingOptions) {
    this.options = {
      vatRate: options?.vatRate ?? DEFAULT_VAT_RATE,
      roundingMode: options?.roundingMode ?? DEFAULT_ROUNDING_MODE,
      locale: options?.locale ?? DEFAULT_LOCALE,
      hooks: options?.hooks ?? {},
    };
  }

  price(order: Order): number {
    return runPipeline(order, this.options);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
