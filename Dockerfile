FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--port", "5173", "--strictPort"]

FROM dependencies AS build
COPY . .
ARG SITE_URL=""
RUN SITE_URL="$SITE_URL" npm run build

# The default target is the production image used by Coolify.
FROM nginx:stable-alpine AS production
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
