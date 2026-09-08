FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY sample-quotes.json SAMPLE_QUOTES.md ./
COPY app.js index.html library.html submit.html admin.html api.html quote-api.js api-demo.js styles.css server.js ./
COPY src ./src

EXPOSE 3000
CMD ["npm", "start"]
