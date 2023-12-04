FROM node:20-alpine

COPY . /app
WORKDIR /app

RUN npm install --only=production

ENTRYPOINT [ "node", "index.js" ]
