.PHONY: test

COMPOSE_PROJECT_NAME ?= stream-service
COMPOSE=docker-compose -f docker-compose.yml -f docker-compose.dev.yml
RUN=${COMPOSE} run api

up:
	docker-compose up -d

down:
	docker-compose down

dev:
	docker-compose up

build:
	docker-compose build

logs:
	docker-compose logs -f

yarn:
	${RUN} yarn ${args}

test:
	${RUN} yarn test ${args}

lint:
	${RUN} yarn lint ${args}

redis-cli:
	${COMPOSE} run redis redis-cli -h redis
