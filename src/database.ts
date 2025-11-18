import sqlite3 from 'sqlite3';
import { Config } from './config';
import { OrderResult } from './types';

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
  private static instance: DatabaseService;
  private db: sqlite3.Database;

  private constructor() {
    const config = Config.getInstance().trading;
    const dbPath = config.sandbox ? './data/bot_sandbox.db' : './data/bot.db';

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      }
      console.log(`Connected to SQLite database at ${dbPath}`);
    });

    this.initDatabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initDatabase(): void {
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

    this.db.run(createTableQuery, (err) => {
      if (err) {
        console.error('Error creating orders table:', err.message);
      }
    });
  }

  public async saveOrder(orderResult: OrderResult, orderType: 'market' | 'limit'): Promise<void> {
    const config = Config.getInstance().trading;
    // Handle pairs like "BTC/USDT" and "BTC/USDT:USDT"
    const [base, quote] = config.pair.split(":")[0].split("/");
    const cost = orderResult.amount * orderResult.price;

    return new Promise<void>((resolve, reject) => {
      const query = `
        INSERT INTO orders (
          timestamp, symbol, base, quote, order_type, amount, price, cost,
          base_total, quote_total, next_order_in_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        query,
        [
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
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public async getRecentOrders(limit: number = 10): Promise<OrderRecord[]> {
    return new Promise<OrderRecord[]>((resolve, reject) => {
      const query = `
        SELECT * FROM orders
        ORDER BY timestamp DESC
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const orders = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            symbol: row.symbol,
            base: row.base,
            quote: row.quote,
            orderType: row.order_type,
            amount: row.amount,
            price: row.price,
            cost: row.cost,
            baseTotal: row.base_total,
            quoteTotal: row.quote_total,
            nextOrderInMs: row.next_order_in_ms
          }));
          resolve(orders);
        }
      });
    });
  }

  public async getOrderStats(): Promise<OrderStats | null> {
    return new Promise<OrderStats | null>((resolve, reject) => {
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

      this.db.get(query, [], async (err, row: any) => {
        if (err) {
          reject(err);
        } else if (!row || row.total_orders === 0) {
          resolve(null);
        } else {
          // Get the latest balance information
          const latestBalanceQuery = `
            SELECT base_total, quote_total
            FROM orders
            ORDER BY timestamp DESC
            LIMIT 1
          `;

          this.db.get(latestBalanceQuery, [], (balanceErr, balanceRow: any) => {
            if (balanceErr) {
              reject(balanceErr);
            } else {
              const stats: OrderStats = {
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
              resolve(stats);
            }
          });
        }
      });
    });
  }

  public async getOrdersInDateRange(startDate: Date, endDate: Date): Promise<OrderRecord[]> {
    return new Promise<OrderRecord[]>((resolve, reject) => {
      const query = `
        SELECT * FROM orders
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
      `;

      this.db.all(
        query,
        [startDate.getTime(), endDate.getTime()],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const orders = rows.map(row => ({
              id: row.id,
              timestamp: row.timestamp,
              symbol: row.symbol,
              base: row.base,
              quote: row.quote,
              orderType: row.order_type,
              amount: row.amount,
              price: row.price,
              cost: row.cost,
              baseTotal: row.base_total,
              quoteTotal: row.quote_total,
              nextOrderInMs: row.next_order_in_ms
            }));
            resolve(orders);
          }
        }
      );
    });
  }

  public async getLastOrder(): Promise<OrderRecord | null> {
    return new Promise<OrderRecord | null>((resolve, reject) => {
      const query = `
        SELECT * FROM orders
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      this.db.get(query, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          const order: OrderRecord = {
            id: row.id,
            timestamp: row.timestamp,
            symbol: row.symbol,
            base: row.base,
            quote: row.quote,
            orderType: row.order_type,
            amount: row.amount,
            price: row.price,
            cost: row.cost,
            baseTotal: row.base_total,
            quoteTotal: row.quote_total,
            nextOrderInMs: row.next_order_in_ms
          };
          resolve(order);
        }
      });
    });
  }

  public async shouldPlaceOrderNow(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.getLastOrder().then((lastOrder) => {
        if (!lastOrder) {
          resolve(true);
          return;
        }

        const nextOrderTime = lastOrder.timestamp + lastOrder.nextOrderInMs;
        const now = Date.now();

        if (nextOrderTime <= now) {
          resolve(true);
        } else {
          const waitTime = nextOrderTime - now;
          console.log(`Skipping order. Next order in ${Math.round(waitTime / 1000 / 60)} minutes`);
          resolve(false);
        }
      }).catch(() => {
        resolve(true);
      });
    });
  }

  public getTimeUntilNextOrder(): Promise<number | null> {
    return new Promise<number | null>((resolve) => {
      this.getLastOrder().then((lastOrder) => {
        if (!lastOrder) {
          resolve(null);
          return;
        }

        const nextOrderTime = lastOrder.timestamp + lastOrder.nextOrderInMs;
        const now = Date.now();
        const timeUntil = nextOrderTime - now;

        resolve(timeUntil > 0 ? timeUntil : 0);
      }).catch(() => {
        resolve(null);
      });
    });
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