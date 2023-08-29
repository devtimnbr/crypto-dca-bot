import ccxt from "ccxt";
import dotenv from "dotenv";
import { cleanEnv, str, bool, num } from "envalid";
import { getDecimals } from "./utils";

dotenv.config();

// validate env vars
const env = cleanEnv(process.env, {
  SANDBOX: bool(),
  EXCHANGE_ID: str({ choices: ccxt.exchanges }),
  PUBLIC_KEY: str(),
  PRIVATE_KEY: str(),
  PAIR: str(),
  DCA_DURATION_IN_MS: num(),
  DCA_BUDGET: num(),
});

export const SANDBOX = env.SANDBOX;
export const EXCHANGE_ID = env.EXCHANGE_ID;
export const PUBLIC_KEY = env.PUBLIC_KEY;
export const PRIVATE_KEY = env.PRIVATE_KEY;
export const PAIR = env.PAIR;
export const DCA_DURATION_IN_MS = env.DCA_DURATION_IN_MS;
export const DCA_BUDGET = env.DCA_BUDGET;
export const DCA_AMOUNT = process.env.DCA_AMOUNT;
export const BASE_DECIMALS = getDecimals(process.env.DCA_AMOUNT.toString());
export const QUOTE_DECIMALS = getDecimals(env.DCA_BUDGET.toString());

// optional
export const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
export const TG_CHAT_ID = process.env.TG_CHAT_ID;
