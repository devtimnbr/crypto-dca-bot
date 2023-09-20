FROM oven/bun

WORKDIR /app

# Copy package.json and bun.lockb first to take advantage of Docker's caching
COPY package.json ./
COPY bun.lockb ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Build TypeScript code
RUN bun run build

CMD ["bun", "run", "start"]
