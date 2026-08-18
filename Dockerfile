FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./

# Install npm dependencies
RUN npm ci --omit=dev

# Copy core engine source code
COPY bin/ ./bin/
COPY src/ ./src/

RUN mkdir -p /app/artifacts

ENV NODE_ENV=production \
    HEADLESS=true

CMD ["node", "bin/monitor.js"]
