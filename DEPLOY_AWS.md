# Deploy Quotes-R-Us on AWS ECS Fargate

This guide deploys Quotes-R-Us as a containerized Express app on ECS Fargate, behind an internet-facing Application Load Balancer, with quotes stored in DynamoDB.

The deployment files are already in this repo:

- `Dockerfile` builds the Node/Express container.
- `deploy/cloudformation.yml` creates ECS Fargate, an ALB, CloudWatch Logs, IAM roles, and DynamoDB.
- `scripts/deploy-fargate.sh` builds the image, pushes it to ECR, deploys the CloudFormation stack, and prints the app URL.

## What AWS Will Create

The CloudFormation stack creates:

- DynamoDB table named `quotes-r-us-quotes` by default.
- ECS cluster named `quotes-r-us`.
- ECS task definition using Fargate.
- ECS service with one running task.
- ECR repository, created by the deploy script if it does not exist.
- Public Application Load Balancer listening on HTTP port 80.
- CloudWatch Logs group `/ecs/quotes-r-us`.
- IAM execution role and task role.
- Security groups for the load balancer and ECS task.

## Prerequisites

Install these on the machine you deploy from:

- Docker
- AWS CLI v2
- Git

Confirm they are available:

```bash
docker --version
aws --version
git --version
```

Configure the AWS CLI for the account you want to deploy into:

```bash
aws configure
```

Then confirm the active identity:

```bash
aws sts get-caller-identity
```

You also need a VPC with at least two public subnets in the same AWS Region. The current template assigns public IPs to Fargate tasks and places both the load balancer and service in public subnets.

## Required AWS Permissions

Use an admin-capable IAM principal for the first deployment, or an IAM principal with permissions for:

- CloudFormation stack create/update/delete
- ECR repository create/read/push
- ECS cluster/service/task definition create/update
- Elastic Load Balancing v2 create/update
- EC2 VPC, subnet, and security group read/create/update
- IAM role and policy create/update
- DynamoDB table create/update
- CloudWatch Logs log group create/update
- STS caller identity

The deploy command passes `CAPABILITY_IAM` because the CloudFormation template creates IAM roles.

## Choose Region, VPC, and Subnets

Pick a region:

```bash
export AWS_REGION=us-east-1
```

List VPCs:

```bash
aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --query 'Vpcs[].{VpcId:VpcId,CidrBlock:CidrBlock,Default:IsDefault}' \
  --output table
```

Set the VPC:

```bash
export VPC_ID=vpc-xxxxxxxxxxxxxxxxx
```

List subnets in that VPC:

```bash
aws ec2 describe-subnets \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[].{SubnetId:SubnetId,AZ:AvailabilityZone,PublicIpOnLaunch:MapPublicIpOnLaunch,CidrBlock:CidrBlock}' \
  --output table
```

Choose at least two public subnets in different Availability Zones when possible. Set them as a comma-separated list:

```bash
export PUBLIC_SUBNET_IDS=subnet-aaaaaaaaaaaaaaaaa,subnet-bbbbbbbbbbbbbbbbb
```

If you are not sure whether a subnet is public, check that its route table has a route to an internet gateway:

```bash
aws ec2 describe-route-tables \
  --region "$AWS_REGION" \
  --filters "Name=association.subnet-id,Values=subnet-aaaaaaaaaaaaaaaaa" \
  --query 'RouteTables[].Routes[]' \
  --output table
```

Look for a `GatewayId` beginning with `igw-` for destination `0.0.0.0/0`.

## Deploy

From the repo root:

```bash
cd /home/ansible/.openclaw/workspace/quotes-r-us
```

Optional names:

```bash
export APP_NAME=quotes-r-us
export STACK_NAME=quotes-r-us
```

Run the deploy script:

```bash
./scripts/deploy-fargate.sh
```

The script does the following:

1. Reads your AWS account ID with `aws sts get-caller-identity`.
2. Creates the ECR repository if needed.
3. Logs Docker into ECR.
4. Builds the Docker image for `linux/amd64`.
5. Pushes the image to ECR.
6. Deploys `deploy/cloudformation.yml`.
7. Prints the CloudFormation stack outputs.

The `AppUrl` output is the public URL for the load balancer.

## Verify

Set the app URL from the CloudFormation output:

```bash
export APP_URL=http://your-load-balancer-dns-name
```

Health check:

```bash
curl -i "$APP_URL/health"
```

Expected result:

```text
HTTP/1.1 200 OK
...
{"ok":true}
```

Create a quote:

```bash
curl -i -X POST "$APP_URL/api/quotes" \
  -H 'content-type: application/json' \
  -d '{"text":"Ship the useful thing.","source":"Quotes-R-Us","tags":["build"]}'
```

List quotes:

```bash
curl -sS "$APP_URL/api/quotes"
```

Get a random quote:

```bash
curl -sS "$APP_URL/api/quotes/random"
```

Open the app in a browser:

```text
http://your-load-balancer-dns-name
```

## Check ECS Service Status

```bash
aws ecs describe-services \
  --region "$AWS_REGION" \
  --cluster "$APP_NAME" \
  --services "$APP_NAME" \
  --query 'services[0].{Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount,Deployments:deployments[].rolloutState}' \
  --output table
```

List tasks:

```bash
aws ecs list-tasks \
  --region "$AWS_REGION" \
  --cluster "$APP_NAME" \
  --service-name "$APP_NAME"
```

## View Logs

Tail app logs:

```bash
aws logs tail "/ecs/$APP_NAME" \
  --region "$AWS_REGION" \
  --follow
```

If the service is not healthy, logs are usually the fastest way to see whether the container failed to start.

## Update the App

After making code changes:

```bash
git status --short
```

Commit the change, then redeploy:

```bash
./scripts/deploy-fargate.sh
```

By default the image tag is the current short Git commit SHA. You can override it:

```bash
export IMAGE_TAG=manual-2026-09-01
./scripts/deploy-fargate.sh
```

## Common Failures

### Docker is not running

Start Docker Desktop or the Docker daemon, then retry.

### AWS credentials are missing or wrong

Check:

```bash
aws sts get-caller-identity
```

If it returns the wrong account, switch profiles:

```bash
export AWS_PROFILE=your-profile-name
aws sts get-caller-identity
```

### CloudFormation fails on IAM permissions

The deploying IAM principal needs permission to create roles and policies. The script already includes `--capabilities CAPABILITY_IAM`.

### ECS task cannot pull the image

For this template, tasks run in public subnets with `AssignPublicIp: ENABLED`. Make sure the subnets have internet access through an internet gateway.

### Load balancer stays unhealthy

Check:

```bash
aws logs tail "/ecs/$APP_NAME" --region "$AWS_REGION" --since 30m
```

Also confirm the app health endpoint works from the load balancer URL:

```bash
curl -i "$APP_URL/health"
```

### The app loads, but quotes do not persist

Confirm the task has the `DYNAMODB_TABLE` environment variable and that the task role can access the table:

```bash
aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs'
```

Then inspect the DynamoDB table:

```bash
aws dynamodb scan \
  --region "$AWS_REGION" \
  --table-name "${APP_NAME}-quotes" \
  --max-items 5
```

## Cleanup

Delete the CloudFormation stack:

```bash
aws cloudformation delete-stack \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME"
```

Wait for deletion:

```bash
aws cloudformation wait stack-delete-complete \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME"
```

The ECR repository is created by the script outside of CloudFormation, so delete it separately if you no longer need it:

```bash
aws ecr delete-repository \
  --region "$AWS_REGION" \
  --repository-name "$APP_NAME" \
  --force
```

## Production Notes

This first deployment is intentionally simple:

- It uses HTTP, not HTTPS.
- It runs the Fargate task in public subnets.
- It has no custom domain.
- It has no quote moderation or admin auth.

For a more production-ready setup, the next improvements should be:

1. Add HTTPS with ACM and an ALB HTTPS listener.
2. Put Fargate tasks in private subnets with NAT or VPC endpoints.
3. Add a custom domain in Route 53.
4. Add moderation before public quotes appear.
5. Add CloudWatch alarms for unhealthy tasks and 5xx responses.

## AWS References

- AWS CLI install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- ECR Docker push flow: https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
- CloudFormation deploy command: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html
- ECS Fargate networking: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
