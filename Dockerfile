FROM node:24-bookworm-slim AS web-build

WORKDIR /build/web

ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npm config set registry https://registry.npmmirror.com/ && \
    yarn config set registry https://registry.npmmirror.com/

COPY web/package.json web/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY web/ ./
RUN yarn build-only

FROM node:24-bookworm-slim AS backend-build

WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/* && \
    npm config set registry https://registry.npmmirror.com/ && \
    yarn config set registry https://registry.npmmirror.com/

COPY package.json yarn.lock ./

# The container only runs the backend service, so strip Electron-only packages.
RUN node -e "const fs=require('fs');const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));for(const section of ['dependencies','devDependencies']){if(!pkg[section]) continue;for(const name of ['custom-electron-titlebar','electron','electron-builder','electron-rebuild','electronmon']) delete pkg[section][name];}fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)+'\n');" && \
    yarn install --frozen-lockfile && \
    yarn cache clean

COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
COPY data ./data

RUN SKIP_WEB_BUILD=1 yarn build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=prod
ENV PORT=10588
ENV WEB_DIR=/app/web

COPY --from=backend-build /build/package.json ./package.json
COPY --from=backend-build /build/node_modules ./node_modules
COPY --from=backend-build /build/data/serve/app.js ./server/app.js
COPY --from=backend-build /build/data ./default-data
COPY --from=web-build /build/web/dist ./web
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN rm -rf /app/default-data/serve /app/default-data/web /app/default-data/oss /app/default-data/logs && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 10588

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "/app/server/app.js"]
