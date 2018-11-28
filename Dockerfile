FROM node:11.3.0-alpine

WORKDIR /app
COPY . .

RUN yarn

CMD ["yarn", "start"]
