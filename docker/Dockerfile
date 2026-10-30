FROM php:8.4-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libonig-dev libsqlite3-dev libxml2-dev libzip-dev && docker-php-ext-install pdo_mysql pdo_sqlite mbstring dom xml xmlwriter zip && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
