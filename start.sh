#!/bin/sh
sed -i "s/__PORT__/${PORT:-80}/g" /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
