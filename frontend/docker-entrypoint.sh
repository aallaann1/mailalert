#!/bin/sh
# Generate config.js dynamically based on environment variables

echo "window.ENV = {" > /usr/share/nginx/html/config.js
if [ -n "$VITE_API_URL" ]; then
  echo "  VITE_API_URL: \"$VITE_API_URL\"," >> /usr/share/nginx/html/config.js
fi
echo "};" >> /usr/share/nginx/html/config.js

# Execute the main command (nginx)
exec "$@"
