FROM node

ADD . /src

WORKDIR /src

RUN npm install

RUN npm run build

RUN rm /src/.env

CMD npm start
