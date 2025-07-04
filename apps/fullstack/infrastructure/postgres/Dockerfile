FROM postgres:17-alpine

# Install the pg_cron extension from the Alpine repo
RUN apk add --no-cache postgresql-pg_cron postgresql-contrib

# Copy extension files to the correct locations for postgres:alpine
RUN cp /usr/lib/postgresql*/pg_cron.so /usr/local/lib/postgresql/ && \
    cp /usr/share/postgresql*/extension/pg_cron* /usr/local/share/postgresql/extension/

EXPOSE 5432