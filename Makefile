.PHONY: test

COMPOSE_PROJECT_NAME ?= stream-service
COMPOSE=docker-compose -f docker-compose.yml -f docker-compose.dev.yml
RUN=${COMPOSE} run api
TERRAFORM=${COMPOSE} run terraform
KUBECTL=${COMPOSE} run kubectl
AWS=${COMPOSE} run aws

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

deploy:	terraform-all docker-all kubectl-apply

terraform:
	${TERRAFORM} ${args}

terraform-all: terraform-init terraform-apply terraform-kubectl-config terraform-kubectl-aws-auth

terraform-init:
	${TERRAFORM} init

terraform-plan:
	${TERRAFORM} plan

terraform-apply:
	${TERRAFORM} apply

terraform-kubectl-config:
	${SHELL} -c "${TERRAFORM} output kubeconfig" | tee "./terraform/kube/config"

terraform-kubectl-aws-auth:
	${SHELL} -c "${TERRAFORM} output stream_service_config_map_aws_auth" | tee "./terraform/kube/aws-auth.yaml"

kubectl:
	${KUBECTL} ${args}

kubectl-config:
	${KUBECTL} config view

kubectl-proxy:
	${COMPOSE} run -p 8001:8001 kubectl proxy --address=0.0.0.0

kubectl-apply:
	${KUBECTL} apply -f /home/.kube/aws-auth.yaml
	${KUBECTL} apply -f /home/.kube/streams-api-redis.yaml
	${KUBECTL} apply -f /home/.kube/streams-api-service.yaml
	DOCKER_REGISTRY=`cat .docker-registry` \
	cat terraform/kube/streams-api-deployment.yaml | \
	sed 's%{REGISTRY_URL}%${DOCKER_REGISTRY}:stream-service%g' | \
	${KUBECTL} apply -f -

docker-all: docker-login docker-registry docker-build docker-push

docker-login:
	echo `${AWS} ecr get-login --no-include-email` | tr -d '\r' | ${SHELL}

docker-registry:
	echo `${AWS} ecr describe-repositories --query 'repositories[?repositoryName==\`stream_service_registry\`].[repositoryUri]' --output text` | tr -d '\r' | tee ".docker-registry"

docker-build:
	docker build -t `cat .docker-registry`:stream-service -f Dockerfile .

docker-push:
	docker push `cat .docker-registry`:stream-service
