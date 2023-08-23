declare namespace NodeJS {
  export interface ProcessEnv {
    SANDBOX: string;
    PUBLIC_KEY: string;
    PRIVATE_KEY: string;
    PAIR: string;
    BUY_AMOUNT: string;
    EXCHANGE_ID: string;
    DCA_DURATION_IN_MS: string;
    DCA_BUDGET: string;
    TG_BOT_TOKEN: string;
    TG_CHAT_ID: string;
  }
}
