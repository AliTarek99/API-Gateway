FROM node:latest
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate --schema ./prisma/company.prisma && npx prisma generate --schema ./prisma/customer.prisma