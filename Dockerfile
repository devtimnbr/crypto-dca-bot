FROM oven/bun

WORKDIR /app

COPY package.json ./
COPY bun.lockb ./

RUN bun install

COPY . .

RUN bun run build

USER bun

CMD ["bun", "run", "start"]

