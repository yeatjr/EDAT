FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --only=production

# Bundle app source
COPY . .

# Expose port 3000 (Cloud Run defaults to 8080, but we can configure it or let it use PORT env var)
EXPOSE 3000

# Start the server
CMD [ "npm", "start" ]
