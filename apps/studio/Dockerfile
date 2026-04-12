# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build
WORKDIR /app
ARG SANITY_STUDIO_PROJECT_ID
ARG SANITY_STUDIO_DATASET=production
ENV SANITY_STUDIO_PROJECT_ID=$SANITY_STUDIO_PROJECT_ID
ENV SANITY_STUDIO_DATASET=$SANITY_STUDIO_DATASET
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx sanity build dist --yes

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
