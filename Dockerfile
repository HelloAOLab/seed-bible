# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM node:24-trixie AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN corepack enable
RUN mkdir -p /temp/dev
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /temp/dev/
COPY patches /temp/dev/patches
RUN cd /temp/dev && pnpm install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /temp/prod/
COPY patches /temp/prod/patches
RUN cd /temp/prod && pnpm install --frozen-lockfile --production --ignore-scripts

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM oven/bun:1 AS prerelease
WORKDIR /usr/src/app
COPY --from=install /temp/dev/node_modules /temp/build/node_modules
COPY ./server /temp/build/server
COPY package.json .

# [optional] tests & build
ENV NODE_ENV=production

RUN bun build --target=bun --outfile=server/dist/index.js /temp/build/server/index.ts

# copy production dependencies and source code into final image
FROM prerelease AS release
ENV NODE_ENV=production

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/server/dist server/dist
COPY --from=prerelease /usr/src/app/package.json .

# run the app
USER bun
EXPOSE 3002/tcp
ENTRYPOINT [ "bun", "run", "server/dist/index.js" ]