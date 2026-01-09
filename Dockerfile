FROM node:20-alpine

RUN apk add --no-cache nginx supervisor

# ---- Backend ----
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install --omit=dev
COPY backend/ ./

# ---- Frontend -> nginx html ----
RUN rm -rf /usr/share/nginx/html/*
COPY frontend/ /usr/share/nginx/html/

# nginx config (lấy file nginx.conf trong frontend)
RUN mkdir -p /run/nginx
COPY frontend/nginx.conf /etc/nginx/http.d/default.conf

# data dir for json (mounted volume)
RUN mkdir -p /data

# supervisor
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
