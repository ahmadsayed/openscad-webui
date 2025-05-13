FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port if your app uses one (adjust as needed)
# EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]