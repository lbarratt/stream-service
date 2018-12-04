# Stream Service

Temporary ELB URL: http://a6c832231f74811e8b47e02e69f5aada-706907864.eu-west-1.elb.amazonaws.com/streams

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

# Environment Variables

| Name | Description |
| --- | --- |
| LOG_LEVEL | Default `debug`. Set which logger levels should be output |
| STREAM_EXPIRY | Default `30`. Set how long a stream token should last before expiration, and how long it should be renewed for |
| REDIS_HOST | The redis server hostname |
| REDIS_PORT | The redis server port |

# Assumptions & Considerations

This is a very simple implementation, and doesn't solve many potential use cases or edge cases. The service is intended to be scaled horizontally, so that the container running the service can be relatively stateless. A redis cluser could be scaled proportionally.

The service uses a 'session' (as a vague method of identifying a user in the absense of an authentication service) and tokens that are allocated against a user to represent each active stream. Ideally, the session token would be checked by calling an authentication service, then returning a unique user ID that could be stored in redis instead of an ephemeral session token.

It JSON based, and is intentionally simplified so that it has a single endpoint that will accept a session to create or retrieve a stream token for the client to use. Tokens expire after 30 seconds. The service could potentially could return the video content directly as an `application/octet-stream` and return error codes via HTTP headers to simplify client implementation.

In the current implementation, the tokens expire after 30 seconds (configured by `STREAM_EXPIRY`).

# Endpoints

## GET /

A basic healtcheck endpoint. Returns 200 OK.

## GET /streams

Get or create a stream token.

To create a new token, send a request with a 'session' of any name sent as the `X-Stream-Session` header e.g.

```
curl "http://localhost:3000/streams" \
     -H 'X-Stream-Session: s3ss10n'
```

A new token should be returned, if you have not exceeded 3 tokens.

```
{
  "session": "s3ss10n",
  "token": "a393bf57-6270-4d5f-9c67-2e4a19060c5d"
}
```

You can create upto 3 tokens with a 30 second time window, as configured by `STREAM_EXPIRY`.

To refresh an existing token, call the same endpoint with the `X-Stream-Token` header:

```
curl "http://localhost:3000/streams" \
     -H 'X-Stream-Session: s3ss10n' \
     -H 'X-Stream-Token: a393bf57-6270-4d5f-9c67-2e4a19060c5d'
```

The same token should be returned back to you, as before.

If you do not specify a session, your token has expired, or you have exceed the maximum number of tokens, you will receive a 401 with the corresponding error message. e.g.

```
{
  "errors": [
    {
      "code": 3,
      "message": "Token expired"
    }
  ]
}
```

# Deployment

Deployment uses terraform to provision and deploy to a Kubernetes cluster on AWS using EKS.

To get started, export the follow AWS environment variables for an IAM user with access to AutoScaling, EC2, EKS, and IAM.

```
export AWS_ACCESS_KEY_ID="anaccesskey"
export AWS_SECRET_ACCESS_KEY="asecretkey"
```

Then run `make deploy` to initialise terraform, apply any changes to the Kubernetes cluster and finally deploy the Stream API pods. The whole process should take around 25 minutes for the first time, to allow AWS to provision resources and the time required to build and push a container image for the Stream API.

## Considerations

The deployment is a really basic EKS cluster with two m5.large nodes. It uses the bare minimum to get the cluster working with permissions to pull container images from ECR. Everything is entirely managed without local dependencies being required, they are instead managed through containers and a handful of `make` commands.

The actual Stream API service runs on 4 containers accross both cluster nodes, with a single redis node/container pod to get something simple working. If time had allowed, redis could be managed via Elasticache or a Helm chart could have been used to manage a scalable cluster.

Further improvements could be made, given more time:

- Migrate k8s provisioning to use a Terraform module
- Migrate Terraform state to S3
- Migrate local k8s yaml files to Helm charts and a Helm repository on S3
