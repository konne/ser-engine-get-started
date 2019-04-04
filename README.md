# ser-engine-get-started
Get Start with the Docker Container of the Sense Excel Reporting Engine.

This is a basic example of how to use sense excel reporting with docker-compose. It shows you how to run basic commands against the ser REST service. The goal is to run a simple report and store the results in the file system.

The basic features which this repository shows are:
- set up a docker-compose file with qlik core and ser rest service 
- upload file
- create task
- check status of running task
- download result


## Requirements
- have docker (docker-compose) installed on your system
- have node.js installed on your system (node.js > 6.x)


## How to use this example
- clone or download this repository to a enviroment where docker-compose and node.js is installed
- run "npm install" inside the cloned/downloaded repository
- run "docker-compose up -d" in docker enviroment
- run "npm run start"
- run "docker-compose down" to stop docker containers
- to see the result check the result.zip file in root folder of the cloned/downloded repository
