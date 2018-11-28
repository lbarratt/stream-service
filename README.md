# Stream Service

# Setup

Requirements:

- docker
- docker-compose
- make

To start the API server, run:

`make up`

To run the test suite, run:

`make test`

# Make commands

| Command | Description |
| --- | --- |
| up | Start the API server, daemonised |
| down | Stop the API server |
| dev | Start the API server with nodemon |
| build | Rebuild the API server Dockerfile |
| logs | Tails service logs |
| yarn | Run the `yarn` package manager. Supply arguments with `args=""` |
| test | Run the test suite with `jest`. Supply arguments with `args=""` |
| lint | Run the linter with `standard`. Supply arguments with `args=""` |

