# Use node base image
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist
# copy the initial migration script and schema files
COPY --from=builder /usr/src/app/src/db ./src/db

EXPOSE 3000

CMD ["node", "dist/app.js"]
