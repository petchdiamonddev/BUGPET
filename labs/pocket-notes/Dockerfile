FROM node:20-alpine

WORKDIR /app
COPY app.js ./

ENV PORT=80 NODE_ENV=production
EXPOSE 80

# Runs as the unprivileged `node` user that ships with the node image.
USER node

CMD ["node", "app.js"]
