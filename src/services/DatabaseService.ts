
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { Config } from '../config';
import { OrderResult } from '../types';

export interface OrderRecord {
  id?: number;
  timestamp: number;
  symbol: string;
  base: string;
  quote: string;
  orderType: 'market' | 'limit';
  amount: number;
  price: number;
  cost: number;
  baseTotal: number;
  quoteTotal: number;
  nextOrderInMs: number;
}

export interface OrderStats {
  totalOrders: number;
  totalAmount: number;
  totalCost: number;
  averagePrice: number;
  firstOrderDate: string;
  lastOrderDate: string;
  baseCurrency: string;
  quoteCurrency: string;
  currentHoldings: {
    base: number;
    quote: number;
    totalValue: number;
  };
}

export class DatabaseService {
  private db: sqlite3.Database;
  private dbRun: (sql: string, params?: any) => Promise<any>;
  private dbGet: (sql: string, params?: any) => Promise<any>;
  private dbAll: (sql: string, params?: any) => Promise<any>;

  constructor() {
    const config = Config.getInstance().trading;
    const dbPath = config.sandbox ? './data/bot_sandbox.db' : './data/bot.db';

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      }
      console.log(`Connected to SQLite database at ${dbPath}`);
    });

    this.dbRun = promisify(this.db.run.bind(this.db));
    this.dbGet = promisify(this.db.get.bind(this.db));
    this.dbAll = promisify(this.db.all.bind(this.db));

    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        base TEXT NOT NULL,
        quote TEXT NOT NULL,
        order_type TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        base_total REAL NOT NULL,
        quote_total REAL NOT NULL,
        next_order_in_ms INTEGER NOT NULL
      )
    `;

    try {
      await this.dbRun(createTableQuery);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error creating orders table:', err.message);
      } else {
        console.error('An unknown error occurred while creating the orders table:', err);
      }
    }
  }

  public async saveOrder(orderResult: OrderResult, orderType: 'market' | 'limit'): Promise<void> {
    const config = Config.getInstance().trading;
    const [base, quote] = config.pair.split(":")[0].split("/");
    const cost = orderResult.amount * orderResult.price;

    const query = `
      INSERT INTO orders (
        timestamp, symbol, base, quote, order_type, amount, price, cost,
        base_total, quote_total, next_order_in_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.dbRun(query, [
      Date.now(),
      config.pair,
      base,
      quote,
      orderType,
      orderResult.amount,
      orderResult.price,
      cost,
      orderResult.baseTotal,
      orderResult.quoteTotal,
      orderResult.nextOrderInMs
    ]);
  }

  public async getRecentOrders(limit: number = 10): Promise<OrderRecord[]> {
    const query = `
      SELECT id, timestamp, symbol, base, quote, order_type as orderType, amount, price, cost, base_total as baseTotal, quote_total as quoteTotal, next_order_in_ms as nextOrderInMs
      FROM orders
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    const rows: OrderRecord[] = await this.dbAll(query, [limit]);
    return rows;
  }

  public async getOrderStats(): Promise<OrderStats | null> {
    const query = `
      SELECT
        COUNT(*) as total_orders,
        SUM(amount) as total_amount,
        SUM(cost) as total_cost,
        AVG(price) as average_price,
        MIN(timestamp) as first_order_timestamp,
        MAX(timestamp) as last_order_timestamp,
        base,
        quote
      FROM orders
    `;

    const row = await this.dbGet(query);

    if (!row || row.total_orders === 0) {
      return null;
    }

    const latestBalanceQuery = `
      SELECT base_total, quote_total
      FROM orders
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const balanceRow = await this.dbGet(latestBalanceQuery);

    return {
      totalOrders: row.total_orders,
      totalAmount: row.total_amount,
      totalCost: row.total_cost,
      averagePrice: row.average_price,
      firstOrderDate: new Date(row.first_order_timestamp).toLocaleDateString(),
      lastOrderDate: new Date(row.last_order_timestamp).toLocaleDateString(),
      baseCurrency: row.base,
      quoteCurrency: row.quote,
      currentHoldings: {
        base: balanceRow?.base_total || 0,
        quote: balanceRow?.quote_total || 0,
        totalValue: 0
      }
    };
  }

  public async getOrdersInDateRange(startDate: Date, endDate: Date): Promise<OrderRecord[]> {
    const query = `
      SELECT id, timestamp, symbol, base, quote, order_type as orderType, amount, price, cost, base_total as baseTotal, quote_total as quoteTotal, next_order_in_ms as nextOrderInMs
      FROM orders
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `;
    const rows: OrderRecord[] = await this.dbAll(query, [startDate.getTime(), endDate.getTime()]);
    return rows;
  }

  public async getLastOrder(): Promise<OrderRecord | null> {
    const query = `
      SELECT id, timestamp, symbol, base, quote, order_type as orderType, amount, price, cost, base_total as baseTotal, quote_total as quoteTotal, next_order_in_ms as nextOrderInMs
      FROM orders
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const row = await this.dbGet(query);
    return row;
  }

  public async shouldPlaceOrderNow(): Promise<boolean> {
    const lastOrder = await this.getLastOrder();
    if (!lastOrder) {
      return true;
    }

    const nextOrderTime = lastOrder.timestamp + lastOrder.nextOrderInMs;
    const now = Date.now();

    if (nextOrderTime <= now) {
      return true;
    } else {
      const waitTime = nextOrderTime - now;
      console.log(`Skipping order. Next order in ${Math.round(waitTime / 1000 / 60)} minutes`);
      return false;
    }
  }

  public async getTimeUntilNextOrder(): Promise<number | null> {
    const lastOrder = await this.getLastOrder();
    if (!lastOrder) {
      return null;
    }

    const nextOrderTime = lastOrder.timestamp + lastOrder.nextOrderInMs;
    const now = Date.now();
    const timeUntil = nextOrderTime - now;

    return timeUntil > 0 ? timeUntil : 0;
  }

  public close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
}
