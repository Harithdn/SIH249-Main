FROM node:20 AS b
WORKDIR /w
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=b /w/dist /usr/share/nginx/html
