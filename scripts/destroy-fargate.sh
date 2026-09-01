#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-quotes-r-us}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-quotes-r-us}"
SKIP_ECR_DELETE="${SKIP_ECR_DELETE:-false}"
FORCE="${FORCE:-false}"

confirm_destroy() {
  if [[ "${FORCE}" == "true" ]]; then
    return
  fi

  echo "This will delete the Quotes-R-Us AWS test environment:"
  echo "  Region: ${AWS_REGION}"
  echo "  CloudFormation stack: ${STACK_NAME}"
  echo "  ECR repository: ${APP_NAME}"
  echo
  echo "The CloudFormation stack includes the ECS service, load balancer, IAM roles, logs, and DynamoDB table."
  echo "Any quotes stored in DynamoDB will be deleted."
  echo
  read -r -p "Type ${STACK_NAME} to continue: " confirmation

  if [[ "${confirmation}" != "${STACK_NAME}" ]]; then
    echo "Confirmation did not match. Nothing was deleted."
    exit 1
  fi
}

stack_exists() {
  aws cloudformation describe-stacks \
    --region "${AWS_REGION}" \
    --stack-name "${STACK_NAME}" >/dev/null 2>&1
}

repository_exists() {
  aws ecr describe-repositories \
    --region "${AWS_REGION}" \
    --repository-names "${APP_NAME}" >/dev/null 2>&1
}

confirm_destroy

if stack_exists; then
  echo "Deleting CloudFormation stack ${STACK_NAME}..."
  aws cloudformation delete-stack \
    --region "${AWS_REGION}" \
    --stack-name "${STACK_NAME}"

  echo "Waiting for stack deletion to complete..."
  aws cloudformation wait stack-delete-complete \
    --region "${AWS_REGION}" \
    --stack-name "${STACK_NAME}"

  echo "Deleted CloudFormation stack ${STACK_NAME}."
else
  echo "CloudFormation stack ${STACK_NAME} was not found in ${AWS_REGION}; skipping."
fi

if [[ "${SKIP_ECR_DELETE}" == "true" ]]; then
  echo "SKIP_ECR_DELETE=true; leaving ECR repository ${APP_NAME} in place."
elif repository_exists; then
  echo "Deleting ECR repository ${APP_NAME} and all images..."
  aws ecr delete-repository \
    --region "${AWS_REGION}" \
    --repository-name "${APP_NAME}" \
    --force >/dev/null

  echo "Deleted ECR repository ${APP_NAME}."
else
  echo "ECR repository ${APP_NAME} was not found in ${AWS_REGION}; skipping."
fi

echo "Cleanup complete."
