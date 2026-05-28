FROM node:20-slim

WORKDIR /app

# Install dependencies required by Puppeteer
RUN apt-get update && apt-get install -y \
    libnss3 libxss1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libgbm1 libpango-1.0-0 libpangocairo-1.0-0 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxinerama1 libxrandr2 libxrender1 \
    libxtst6 fonts-liberation xdg-utils ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci
RUN npm run postinstall

COPY src ./src
COPY scripts ./scripts
COPY *.html ./
COPY images ./images

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node scripts/healthcheck.js || exit 1

CMD ["npm", "start"]
