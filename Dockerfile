FROM node:20-slim

WORKDIR /app

# Install Chrome and all its dependencies
RUN apt-get update && apt-get install -y \
    wget gnupg unzip curl \
    libnss3 libxss1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libgbm1 libpango-1.0-0 libpangocairo-1.0-0 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxinerama1 libxrandr2 libxrender1 \
    libxtst6 fonts-liberation xdg-utils ca-certificates \
    && \
    # Add Google Chrome repository and install Chrome
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && apt-get install -y google-chrome-stable && \
    # Clean up
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Verify Chrome is installed
RUN google-chrome --version

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