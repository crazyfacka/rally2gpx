FROM node:20-alpine

COPY . /app
WORKDIR /app

RUN npm install --omit=dev

ENTRYPOINT [ "node", "index.js" ]
