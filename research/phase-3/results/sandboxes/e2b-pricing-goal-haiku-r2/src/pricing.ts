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
// Money values
// ---------------------------------------------------------------------------

/**
 * A currency-tagged amount. Arithmetic returns new values; the currency tag is
 * carried through every operation so a future multi-currency ledger can rely
 * on it.
 */
class MoneyValue {
  constructor(
    private readonly rawAmount: number,
    private readonly currencyCode: Currency,
  ) {}

  amount(): number {
    return this.rawAmount;
  }

  currency(): Currency {
    return this.currencyCode;
  }

  plus(other: MoneyValue): MoneyValue {
    if (other.currencyCode !== this.currencyCode) {
      throw new Error("cannot add across currencies without conversion");
    }
    return new MoneyValue(this.rawAmount + other.rawAmount, this.currencyCode);
  }

  times(factor: number): MoneyValue {
    return new MoneyValue(this.rawAmount * factor, this.currencyCode);
  }

  withAmount(amount: number): MoneyValue {
    return new MoneyValue(amount, this.currencyCode);
  }
}


// ---------------------------------------------------------------------------
// Discount strategies
// ---------------------------------------------------------------------------

interface DiscountStrategy {
  readonly name: string;
  applies(order: Order): boolean;
  apply(subtotal: number): number;
}

class BulkDiscountStrategy implements DiscountStrategy {
  readonly name = "bulk";

  applies(order: Order): boolean {
    let totalQuantity = 0;
    for (const item of order.items) {
      totalQuantity += item.quantity;
    }
    return totalQuantity >= 10;
  }

  apply(subtotal: number): number {
    return subtotal * 0.9;
  }
}

class MultiLineDiscountStrategy implements DiscountStrategy {
  readonly name = "multi-line";

  applies(order: Order): boolean {
    const distinctNames = new Set(order.items.map(item => item.name));
    return distinctNames.size >= 3;
  }

  apply(subtotal: number): number {
    return subtotal * 0.98;
  }
}

class LoyaltyDiscountStrategy implements DiscountStrategy {
  readonly name = "loyalty";

  applies(order: Order): boolean {
    return order.loyaltyMember;
  }

  apply(subtotal: number): number {
    return subtotal * 0.95;
  }
}

/** Application order matters: bulk, then multi-line, then loyalty. */
const DEFAULT_DISCOUNT_STRATEGIES: DiscountStrategy[] = [
  new BulkDiscountStrategy(),
  new MultiLineDiscountStrategy(),
  new LoyaltyDiscountStrategy(),
];

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
// Rounding
// ---------------------------------------------------------------------------

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Pricing pipeline
// ---------------------------------------------------------------------------

interface PricingContext {
  readonly order: Order;
  readonly options: ReturnType<typeof resolveOptions>;
  running: MoneyValue;
}

interface PipelineStage {
  readonly stageName: string;
  execute(context: PricingContext): void;
}

class SubtotalStage implements PipelineStage {
  readonly stageName = "subtotal";

  execute(context: PricingContext): void {
    let total = new MoneyValue(0, context.order.currency);
    for (const item of context.order.items) {
      const lineTotal = item.unitPrice * item.quantity;
      total = total.plus(new MoneyValue(lineTotal, context.order.currency));
    }
    context.running = total;
  }
}

class DiscountStage implements PipelineStage {
  readonly stageName = "discount";

  constructor(private readonly strategies: DiscountStrategy[]) {}

  execute(context: PricingContext): void {
    let result = context.running.amount();
    for (const strategy of this.strategies) {
      if (strategy.applies(context.order)) {
        result = strategy.apply(result);
      }
    }
    context.running = context.running.withAmount(result);
  }
}

class TaxStage implements PipelineStage {
  readonly stageName = "tax";

  execute(context: PricingContext): void {
    context.running = context.running.times(1 + context.options.vatRate);
  }
}

class RoundingStage implements PipelineStage {
  readonly stageName = "rounding";

  execute(context: PricingContext): void {
    context.running = context.running.withAmount(
      round(context.running.amount()),
    );
  }
}

class PricingPipeline {
  constructor(private readonly stages: PipelineStage[]) {}

  run(order: Order, options: ReturnType<typeof resolveOptions>): number {
    const context: PricingContext = {
      order,
      options,
      running: new MoneyValue(0, order.currency),
    };
    for (const stage of this.stages) {
      if (options.hooks.beforeStage) {
        options.hooks.beforeStage(stage.stageName);
      }
      stage.execute(context);
      if (options.hooks.afterStage) {
        options.hooks.afterStage(stage.stageName, context.running.amount());
      }
    }
    return context.running.amount();
  }
}

// ---------------------------------------------------------------------------
// Factory and facade
// ---------------------------------------------------------------------------

class PricingPipelineFactory {
  static create(): PricingPipeline {
    return new PricingPipeline([
      new SubtotalStage(),
      new DiscountStage(DEFAULT_DISCOUNT_STRATEGIES),
      new TaxStage(),
      new RoundingStage(),
    ]);
  }
}

export class PricingFacade {
  private readonly pipeline: PricingPipeline;
  private readonly options: ReturnType<typeof resolveOptions>;

  constructor(options?: PricingOptions) {
    this.pipeline = PricingPipelineFactory.create();
    this.options = resolveOptions(options);
  }

  price(order: Order): number {
    return this.pipeline.run(order, this.options);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
