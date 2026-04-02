FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --silent

COPY . .
EXPOSE 3000
CMD ["node", "users-service.js"]
