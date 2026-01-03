# Use Node.js 22 (Required for latest Vite)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app files
COPY . .

# Expose Vite's default port
EXPOSE 3000

# Start the app with --host so Docker can access it
CMD ["npm", "run", "dev", "--", "--host"]