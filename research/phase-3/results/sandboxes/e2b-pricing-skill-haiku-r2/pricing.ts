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

// ---------------------------------------------------------------------------
// Pricing options
// ---------------------------------------------------------------------------

const DEFAULT_PRICING_OPTIONS = {
  vatRate: 0.2,
  roundingMode: "half-up" as const,
  locale: "en-GB",
};

function resolveOptions(options?: PricingOptions) {
  return {
    ...DEFAULT_PRICING_OPTIONS,
    ...(options ?? {}),
    hooks: options?.hooks ?? {},
  };
}

// ---------------------------------------------------------------------------
// Money values
// ---------------------------------------------------------------------------

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
// Discounts
// ---------------------------------------------------------------------------

const round = (value: number): number => Math.round(value * 100) / 100;

interface Discount {
  readonly name: string;
  applies(order: Order): boolean;
  apply(subtotal: number): number;
}

const discounts: Discount[] = [
  {
    name: "bulk",
    applies: (order) =>
      order.items.reduce((sum, item) => sum + item.quantity, 0) >= 10,
    apply: (subtotal) => subtotal * 0.9,
  },
  {
    name: "multi-line",
    applies: (order) => {
      const names = new Set(order.items.map((item) => item.name));
      return names.size >= 3;
    },
    apply: (subtotal) => subtotal * 0.98,
  },
  {
    name: "loyalty",
    applies: (order) => order.loyaltyMember,
    apply: (subtotal) => subtotal * 0.95,
  },
];

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

const stages: PipelineStage[] = [
  {
    stageName: "subtotal",
    execute: (context) => {
      let total = new MoneyValue(0, context.order.currency);
      for (const item of context.order.items) {
        total = total.plus(
          new MoneyValue(item.unitPrice * item.quantity, context.order.currency),
        );
      }
      context.running = total;
    },
  },
  {
    stageName: "discount",
    execute: (context) => {
      let result = context.running.amount();
      for (const discount of discounts) {
        if (discount.applies(context.order)) {
          result = discount.apply(result);
        }
      }
      context.running = context.running.withAmount(result);
    },
  },
  {
    stageName: "tax",
    execute: (context) => {
      context.running = context.running.times(1 + context.options.vatRate);
    },
  },
  {
    stageName: "rounding",
    execute: (context) => {
      context.running = context.running.withAmount(
        round(context.running.amount()),
      );
    },
  },
];

class PricingPipeline {
  run(order: Order, options: ReturnType<typeof resolveOptions>): number {
    const context: PricingContext = {
      order,
      options,
      running: new MoneyValue(0, order.currency),
    };
    for (const stage of stages) {
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
// Facade
// ---------------------------------------------------------------------------

export class PricingFacade {
  private readonly pipeline = new PricingPipeline();
  private readonly options: ReturnType<typeof resolveOptions>;

  constructor(options?: PricingOptions) {
    this.options = resolveOptions(options);
  }

  price(order: Order): number {
    return this.pipeline.run(order, this.options);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
