FROM node:24.12.0-alpine
WORKDIR /app
COPY --chown=node:node server.mjs package.json ./
COPY --chown=node:node site ./site
COPY --chown=node:node scripts ./scripts
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups
USER node
ENV HOST=0.0.0.0 PORT=4173 DATA_DIR=/app/data NODE_ENV=production
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
