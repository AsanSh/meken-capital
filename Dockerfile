FROM node:24.12.0-alpine
WORKDIR /app
# Dependencies first: a source change must not reinstall them.
COPY --chown=node:node package.json package-lock.json ./
# pg is a runtime dependency for the PostgreSQL path. Without it the image only
# works on the built-in node:sqlite and crashes on start when DATABASE_URL is set.
RUN npm ci --omit=dev && npm cache clean --force && chown -R node:node /app/node_modules
COPY --chown=node:node server.mjs ./
COPY --chown=node:node site ./site
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node lib ./lib
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups
USER node
ENV HOST=0.0.0.0 PORT=4173 DATA_DIR=/app/data NODE_ENV=production
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
