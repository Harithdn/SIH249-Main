FROM node:20 AS b
WORKDIR /w
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=b /w/dist /usr/share/nginx/html
