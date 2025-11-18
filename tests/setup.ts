// Mock environment variables for tests
process.env.SANDBOX = "false";
process.env.EXCHANGE_ID = "kraken";
process.env.PUBLIC_KEY = "test-public-key";
process.env.PRIVATE_KEY = "test-private-key";
process.env.PAIR = "BTC/USD";
process.env.DCA_BUDGET = "1000";
process.env.MIN_QUOTE_AMOUNT = "1";
process.env.MIN_BASE_AMOUNT = "0.00001";
process.env.DCA_DURATION_IN_MS = "2592000000";
process.env.TG_BOT_TOKEN = "";
process.env.TG_CHAT_ID = "";