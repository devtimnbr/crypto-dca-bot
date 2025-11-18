import { DCABot } from "./bot";

async function main(): Promise<void> {
  try {
    const bot = new DCABot();
    await bot.start();
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});