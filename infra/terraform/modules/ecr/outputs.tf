output "repository_urls" {
  value = {
    for k, v in aws_ecr_repository.services : k => v.repository_url
  }
  description = "Map service name to ECR repository URL"
}

output "repository_arns" {
  value = {
    for k, v in aws_ecr_repository.services : k => v.arn
  }
}
