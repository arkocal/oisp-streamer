FROM node:8-alpine

RUN npm install kafkajs validator ws keycloak-connect uuid
ADD streamer.js streamer.js

EXPOSE 9000

CMD ["node", "streamer.js"]