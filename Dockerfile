FROM node:24-slim
WORKDIR /app
COPY . .
RUN npm ci && npm run build && npm cache clean --force
CMD ["npm", "run", "start"]
