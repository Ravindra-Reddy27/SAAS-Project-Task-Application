# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the mandatory port 5000 [cite: 65]
EXPOSE 5000

# Start the application
CMD ["npm", "start"]