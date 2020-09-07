# build stage
FROM node as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run tsc
EXPOSE 80
CMD ["node", "build/app.js"]
