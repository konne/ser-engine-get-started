# ser-engine-get-started
Get Start with the Docker Container of the Sense Excel Reporting Engine.
This is a example of how to use sense excel reporting in docker. It shows how to make a on demand report, and how to create several reports dependend from selection made in the configuration, send to sense excel reportin service.

## How to use this example
- clone or download this repository
- copy the docker-compose file to your docker enviroment
- create apps folder next to docker-compose file and include "Executive Dashboard.qvf"
- create reports folder next to docker-compose file (just for debugging purpose)
- create fonts folder next to docker-compose file and insert calibri font to the folder (required for report layout, not mandatory)
- run "docker-compose up" in docker enviroment
- check if the credentials in src/config.json are correct
- go back to downloaded repository and "npm install"
- run "npm run start"