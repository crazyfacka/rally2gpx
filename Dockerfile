FROM node:12-alpine

COPY . /app
WORKDIR /app

RUN npm install --only=production

ENTRYPOINT [ "node", "index.js" ]
