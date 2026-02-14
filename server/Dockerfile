# Use a Node.js base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build

# Expose the port the app runs on
ENV PORT 8080
EXPOSE 8080

# Start the application
CMD [ "pnpm", "start" ]
