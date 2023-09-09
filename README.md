# Crypto DCA Bot

This script automatically buys bitcoin or a specific cryptocurrency based on user environment settings using the [CCXT library](https://github.com/ccxt/ccxt).

**Disclaimer: This script is for educational purposes only and is not intended to be used as financial advice. The author of this script is not responsible for any financial loss that may occur as a result of using this script. Use at your own risk.**

## How it Works

The script utilizes the [CCXT library](https://github.com/ccxt/ccxt) to communicate with the exchange API and can be configured using environment variables. Once the necessary environment variables have been set up, the script will automatically place buy orders for the specified cryptocurrency at regular intervals using the dollar-cost averaging (DCA) strategy.

Dollar-cost averaging is a strategy that involves investing a fixed dollar amount in an asset at regular intervals, regardless of the asset's price. This approach helps investors to avoid trying to time the market and allows them to benefit from the natural fluctuations in the asset's price over time.

The script determines the optimal time to place the next order based on the user's environment settings and the current market price of the cryptocurrency. This calculation ensures that the script will spend the fixed budget for the asset for the specified duration without overspending or underspending.

If the exchange account runs out of funds (quote currency), the script logs the issue and can send a notification via Telegram.

Using a custom DCA script like this one provides flexibility in choosing your own DCA strategy and enables you to bypass exchange-specific DCA fees. While many exchanges offer their own DCA features, they are often limited to specific cryptocurrencies and can come with fees that reduce your profits over time.

## Requirements

To use this script, you will need:

- bun 1.0 or later [bun.sh](https://bun.sh)
- An account on a supported exchange with API keys. [Here](https://github.com/ccxt/ccxt#supported-cryptocurrency-exchange-markets) is a list of supported exchanges.

## Configuration

The following environment variables are required:

- `SANDBOX`: Set exchange sandbox mode if supported (`true or false`).
- `EXCHANGE_ID`: The ID of the exchange you are using (e.g. `kraken`).
- `PUBLIC_KEY`: Your exchange API public key.
- `PRIVATE_KEY`: Your exchange API private key.
- `PAIR`: The currency pair to trade (e.g. `BTC/EUR`).
- `DCA_AMOUNT`: (OPTIONAL) The amount of crypto/currency (e.g., BTC) to accumulate per DCA order (e.g., 0.001). If not set, it will calculate the exchange-specific minimum order amount.
- `DCA_BUDGET`: The total amount of quote currency (e.g. EUR) to use for DCA (e.g. `1000`).
- `DCA_DURATION_IN_MS`: The duration of the dollar cost averaging (DCA) period in milliseconds (e.g. `2592000000` for 30 days).

  | Duration | Value (ms)  |
  | -------- | ----------- |
  | Day      | 86400000    |
  | Week     | 604800000   |
  | Month    | 2592000000  |
  | Year     | 31536000000 |

## Installation

1. Clone this repository.
2. Install dependencies: `bun install`
3. Create a `.env` file with your exchange API keys and other environment variables (see `.env.example` for an example).
4. Build the script: `bun run build`
5. Start the script: `bun run start`

### Installation with Docker

1. Clone this repository.
2. Create a `.env` file with your exchange API keys and other environment variables (see `.env.example` for an example).
3. Build the Docker image:

```bash
docker build -t crypto-dca-bot .
```

4. Start the Docker container:

```bash
docker run -d --name crypto-dca-bot --env-file .env crypto-dca-bot
```

### Installation with docker-compose

Alternatively, you can use Docker Compose to start the container:

1. Clone this repository.
2. Create a `.env` file with your exchange API keys and other environment variables (see `.env.example` for an example).
3. Run the following command to buld and start the container:

```bash
docker-compose up -d
```

This will start the container in detached mode. If you want to view the logs, you can use the following command:

```bash
docker-compose logs -f
```

Note that the `restart: unless-stopped` option in the `docker-compose.yml` file will automatically restart the container if it stops or the system reboots.

## License

This script is licensed under the [MIT License](https://opensource.org/licenses/MIT).
