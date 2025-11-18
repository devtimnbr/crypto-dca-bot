FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build:prod

# Create data directory and make it writable by everyone
RUN mkdir -p /app/data && chmod 777 /app/data

USER node

CMD ["npm", "start"]

