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

const SUPPORTED_CURRENCIES: Currency[] = ["GBP", "EUR", "USD"];

function subtotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function applyDiscounts(total: number, order: Order): number {
  const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const distinctItems = new Set(order.items.map((i) => i.name)).size;

  if (totalQuantity >= 10) total *= 0.9; // bulk
  if (distinctItems >= 3) total *= 0.98; // multi-line
  if (order.loyaltyMember) total *= 0.95; // loyalty

  return total;
}

function roundForCurrency(value: number, currency: Currency): number {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
  return Math.round(value * 100) / 100;
}

function runPipeline(order: Order, vatRate: number, hooks: PricingHooks): number {
  const run = (name: string, fn: () => number): number => {
    hooks.beforeStage?.(name);
    const total = fn();
    hooks.afterStage?.(name, total);
    return total;
  };

  let total = run("subtotal", () => subtotal(order));
  total = run("discount", () => applyDiscounts(total, order));
  total = run("tax", () => total * (1 + vatRate));
  total = run("rounding", () => roundForCurrency(total, order.currency));

  return total;
}

export class PricingFacade {
  private readonly vatRate: number;
  private readonly roundingMode: "half-up";
  private readonly locale: string;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.roundingMode = options?.roundingMode ?? DEFAULT_ROUNDING_MODE;
    this.locale = options?.locale ?? DEFAULT_LOCALE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    return runPipeline(order, this.vatRate, this.hooks);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}

class UNUSED_MoneyValue_PLACEHOLDER {
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

/**
 * Conversion table between supported currencies. Orders are priced in their
 * own currency today, so every rate is 1; the table exists so that cross-
 * currency pricing can be introduced without touching the pipeline.
 */
class CurrencyConversionTable {
  rate(from: Currency, to: Currency): number {
    if (from === to) return 1;
    return 1;
  }
}

class CurrencyConverter {
  constructor(private readonly table: CurrencyConversionTable) {}

  convert(value: MoneyValue, target: Currency): MoneyValue {
    const rate = this.table.rate(value.currency(), target);
    return new MoneyValue(value.amount() * rate, target);
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

  private totalQuantity(order: Order): number {
    let totalQuantity = 0;
    for (const item of order.items) {
      totalQuantity += item.quantity;
    }
    return totalQuantity;
  }

  applies(order: Order): boolean {
    return this.totalQuantity(order) >= 10;
  }

  apply(subtotal: number): number {
    return subtotal * 0.9;
  }
}

class MultiLineDiscountStrategy implements DiscountStrategy {
  readonly name = "multi-line";

  private distinctLineNames(order: Order): string[] {
    const seen: string[] = [];
    for (const item of order.items) {
      let alreadySeen = false;
      for (const name of seen) {
        if (name === item.name) {
          alreadySeen = true;
        }
      }
      if (!alreadySeen) {
        seen.push(item.name);
      }
    }
    return seen;
  }

  applies(order: Order): boolean {
    return this.distinctLineNames(order).length >= 3;
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

interface RoundingPolicy {
  readonly currency: Currency;
  round(value: number): number;
}

class GbpRoundingPolicy implements RoundingPolicy {
  readonly currency = "GBP";

  round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

class EurRoundingPolicy implements RoundingPolicy {
  readonly currency = "EUR";

  round(value: number): number {
    const scaled = value * 100;
    const rounded = Math.round(scaled);
    return rounded / 100;
  }
}

class UsdRoundingPolicy implements RoundingPolicy {
  readonly currency = "USD";

  round(value: number): number {
    const cents = Math.round(value * 100);
    return cents / 100;
  }
}

class RoundingPolicyResolver {
  private readonly policies: RoundingPolicy[] = [
    new GbpRoundingPolicy(),
    new EurRoundingPolicy(),
    new UsdRoundingPolicy(),
  ];

  resolve(currency: Currency): RoundingPolicy {
    for (const policy of this.policies) {
      if (policy.currency === currency) {
        return policy;
      }
    }
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
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

  private lineTotal(item: OrderItem): number {
    return item.unitPrice * item.quantity;
  }

  execute(context: PricingContext): void {
    let total = new MoneyValue(0, context.order.currency);
    for (const item of context.order.items) {
      total = total.plus(
        new MoneyValue(this.lineTotal(item), context.order.currency),
      );
    }
    context.running = total;
  }
}

class DiscountStage implements PipelineStage {
  readonly stageName = "discount";

  constructor(private readonly registry: DiscountStrategyRegistry) {}

  execute(context: PricingContext): void {
    let result = context.running.amount();
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

  constructor(
    private readonly resolver: RoundingPolicyResolver,
    private readonly converter: CurrencyConverter,
  ) {}

  execute(context: PricingContext): void {
    const settled = this.converter.convert(
      context.running,
      context.order.currency,
    );
    const policy = this.resolver.resolve(settled.currency());
    context.running = settled.withAmount(policy.round(settled.amount()));
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
    const converter = new CurrencyConverter(new CurrencyConversionTable());
    return new PricingPipeline([
      new SubtotalStage(),
      new DiscountStage(createDefaultDiscountRegistry()),
      new TaxStage(),
      new RoundingStage(new RoundingPolicyResolver(), converter),
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
