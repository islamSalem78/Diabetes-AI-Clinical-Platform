FROM node:20-alpine AS base

WORKDIR /app/server

# Install dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy server source code
COPY server ./ 

# Copy shared data file required by nutrition module
# nutrition.js reads foods.csv from the parent directory of CWD (/app/)
WORKDIR /app
COPY foods.csv ./foods.csv

# Set working directory back to server
WORKDIR /app/server
ENV NODE_ENV=production

# Railway provides PORT via env; app uses process.env.PORT
EXPOSE 4000

CMD ["node", "src/index.js"]
