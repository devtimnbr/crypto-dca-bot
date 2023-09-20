import { Database } from "bun:sqlite";
import { Order } from "ccxt";
import { PAIR } from "./constants";

class Db {
  db: Database;

  constructor() {
    this.db = new Database("data/db.sqlite", { create: true });
    this.createTable();
  }

  private createTable() {
    this.db.exec(
      `
            CREATE TABLE IF NOT EXISTS trades (
            symbol TEXT,
            side TEXT CHECK(side IN ('buy', 'sell')),
            price REAL,
            cost REAL,
            fee REAL,
            amount REAL,
            time DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `
    );
  }

  insertTrade(trade: Order) {
    return this.db
      .query(
        `
            INSERT INTO trades (symbol, side, price, cost, fee, amount)
            VALUES ($symbol, $side, $price, $cost, $fee, $amount)
        `
      )
      .values({
        $symbol: PAIR,
        $side: trade.side,
        $price: trade.price,
        $cost: trade.cost,
        $fee: trade.fee.cost,
        $amount: trade.amount,
      });
  }

  getAllTrades() {
    return this.db.prepare("SELECT * FROM trades").all();
  }

  countTradesAll() {
    return this.db.prepare("SELECT COUNT(*) AS count FROM trades").get() as { count: number };
  }

  countTradesSymbol(symbol: string) {
    return this.db.query("SELECT COUNT(*) AS count FROM trades WHERE symbol = $symbol").get({ $symbol: symbol }) as {
      count: number;
    };
  }

  calculateAvgPriceAll() {
    return this.db
      .query(
        `
            SELECT symbol, SUM(price * amount) / SUM(amount) AS avgPrice
            FROM trades
            GROUP BY symbol
        `
      )
      .all();
  }

  calculateAvgPriceSymbol(symbol: string) {
    return this.db
      .query(
        `
            SELECT SUM(price * amount) / SUM(amount) AS avgPrice
            FROM trades
            WHERE symbol = $symbol
        `
      )
      .get({ $symbol: symbol }) as { avgPrice: number };
  }

  calculateTotalAmountAll() {
    return this.db
      .prepare(
        `
            SELECT symbol, SUM(amount) AS totalamount
            FROM trades
            GROUP BY symbol
        `
      )
      .all();
  }

  calculateTotalAmountSymbol(symbol: string) {
    return this.db
      .query(
        `
            SELECT SUM(amount) AS totalAmount
            FROM trades
            WHERE symbol = $symbol
        `
      )
      .get({ $symbol: symbol }) as { totalAmount: number };
  }

  calculateTotalFeesAndPercentageAll() {
    return this.db
      .prepare(
        `
            SELECT symbol,
            SUM(fee) AS totalFees,
            SUM(fee) * 100 / SUM(cost) AS feePercentage
            FROM trades
            GROUP BY symbol
        `
      )
      .all();
  }

  calculateTotalFeesAndPercentageSymbol(symbol: string) {
    return this.db
      .query(
        `
            SELECT 
            SUM(fee) AS totalFees,
            SUM(fee) * 100 / SUM(cost) AS feePercentage
            FROM trades
            WHERE symbol = $symbol
        `
      )
      .get({ $symbol: symbol }) as { totalFees: number; feePercentage: number };
  }

  close() {
    this.db.close();
  }
}

// Export the instance to use in other files
export default new Db();
