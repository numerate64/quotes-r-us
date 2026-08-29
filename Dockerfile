FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY app.js index.html library.html submit.html styles.css server.js ./
COPY src ./src

EXPOSE 3000
CMD ["npm", "start"]
