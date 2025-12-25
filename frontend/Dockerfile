# Use a lightweight web server
FROM nginx:alpine

# Create a simple index file to prove it works
RUN echo "<h1>Frontend is Running</h1>" > /usr/share/nginx/html/index.html

# Expose the mandatory port 3000
EXPOSE 3000

# Configure nginx to listen on port 3000 instead of default 80
RUN sed -i 's/80/3000/g' /etc/nginx/conf.d/default.conf