# Nothing to install. The image exists so you do not have to install Node locally.
FROM node:20-alpine

WORKDIR /app
COPY . .

CMD ["npm", "test"]
