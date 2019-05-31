FROM node:10

RUN apt-get update \
    && apt-get install -y git

# Add ledger node + ledger agent repo & did cli to add DIDs to the ledger
RUN git clone https://github.com/creatornader/veres-one/ -b plugin-added --single-branch
RUN git clone https://github.com/creatornader/did-cli/ -b testnetv2 --single-branch

# Set the workdir /var/www/myapp
WORKDIR /veres-one

# Run npm install - install the npm dependencies
RUN npm install

COPY . .

# Expose application ports - (4300 - for API and 4301 - for front end)
EXPOSE 4300 4301