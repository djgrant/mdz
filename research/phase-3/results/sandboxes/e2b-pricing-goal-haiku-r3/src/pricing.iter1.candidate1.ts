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
    readonly amount: number,
    readonly currency: Currency,
  ) {}

  plus(other: MoneyValue): MoneyValue {
    if (other.currency !== this.currency) {
      throw new Error("cannot add across currencies without conversion");
    }
    return new MoneyValue(this.amount + other.amount, this.currency);
  }

  times(factor: number): MoneyValue {
    return new MoneyValue(this.amount * factor, this.currency);
  }

  withAmount(amount: number): MoneyValue {
    return new MoneyValue(amount, this.currency);
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
    let total = 0;
    for (const item of order.items) {
      total += item.quantity;
    }
    return total >= 10;
  }

  apply(subtotal: number): number {
    return subtotal * 0.9;
  }
}

class MultiLineDiscountStrategy implements DiscountStrategy {
  readonly name = "multi-line";

  applies(order: Order): boolean {
    const distinct = new Set(order.items.map(item => item.name));
    return distinct.size >= 3;
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

class DiscountStrategyRegistry {
  private readonly strategies: DiscountStrategy[] = [];

  register(strategy: DiscountStrategy): DiscountStrategyRegistry {
    this.strategies.push(strategy);
    return this;
  }

  all(): readonly DiscountStrategy[] {
    return this.strategies;
  }
}

/** Application order matters: bulk, then multi-line, then loyalty. */
function createDefaultDiscountRegistry(): DiscountStrategyRegistry {
  return new DiscountStrategyRegistry()
    .register(new BulkDiscountStrategy())
    .register(new MultiLineDiscountStrategy())
    .register(new LoyaltyDiscountStrategy());
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
// Rounding policies
// ---------------------------------------------------------------------------

function roundToTwoDecimals(value: number): number {
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
      total = total.plus(
        new MoneyValue(item.unitPrice * item.quantity, context.order.currency),
      );
    }
    context.running = total;
  }
}

class DiscountStage implements PipelineStage {
  readonly stageName = "discount";

  constructor(private readonly registry: DiscountStrategyRegistry) {}

  execute(context: PricingContext): void {
    let result = context.running.amount;
    for (const strategy of this.registry.all()) {
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
    const rounded = roundToTwoDecimals(context.running.amount);
    context.running = context.running.withAmount(rounded);
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
        options.hooks.afterStage(stage.stageName, context.running.amount);
      }
    }
    return context.running.amount;
  }
}

// ---------------------------------------------------------------------------
// Factory and facade
// ---------------------------------------------------------------------------

class PricingPipelineFactory {
  static create(): PricingPipeline {
    return new PricingPipeline([
      new SubtotalStage(),
      new DiscountStage(createDefaultDiscountRegistry()),
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
