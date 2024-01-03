FROM node:20.10.0
WORKDIR /home/node/app
COPY package.json .
RUN chown -R node:node /home/node/app
USER node
RUN npm install
COPY --chown=node:node . .
CMD ["sh", "init.sh"]
