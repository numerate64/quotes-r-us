#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-quotes-r-us}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-quotes-r-us}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

if [[ -z "${VPC_ID:-}" || -z "${PUBLIC_SUBNET_IDS:-}" ]]; then
  echo "Set VPC_ID and PUBLIC_SUBNET_IDS before deploying."
  echo "Example: PUBLIC_SUBNET_IDS=subnet-aaa,subnet-bbb VPC_ID=vpc-123 ./scripts/deploy-fargate.sh"
  exit 1
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"
IMAGE_URI="${ECR_REPO}:${IMAGE_TAG}"

aws ecr describe-repositories \
  --repository-names "${APP_NAME}" \
  --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository \
    --repository-name "${APP_NAME}" \
    --image-scanning-configuration scanOnPush=true \
    --region "${AWS_REGION}" >/dev/null

aws ecr get-login-password --region "${AWS_REGION}" |
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build --platform linux/amd64 -t "${IMAGE_URI}" .
docker push "${IMAGE_URI}"

aws cloudformation deploy \
  --stack-name "${STACK_NAME}" \
  --template-file deploy/cloudformation.yml \
  --capabilities CAPABILITY_IAM \
  --region "${AWS_REGION}" \
  --parameter-overrides \
    AppName="${APP_NAME}" \
    ImageUri="${IMAGE_URI}" \
    VpcId="${VPC_ID}" \
    PublicSubnetIds="${PUBLIC_SUBNET_IDS}"

aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${AWS_REGION}" \
  --query "Stacks[0].Outputs"
