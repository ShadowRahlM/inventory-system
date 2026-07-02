FROM node:24-alpine AS builder

ARG VITE_API_URL=/api

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN VITE_API_URL=${VITE_API_URL} npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
