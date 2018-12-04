FROM node:11.3.0-alpine

WORKDIR /app
COPY . .

RUN yarn

EXPOSE 3000

CMD ["yarn", "start"]
