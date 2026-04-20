output "secret_arns" {
  value = {
    for k, v in aws_secretsmanager_secret.app : k => v.arn
  }
  description = "Map of logical secret name to ARN"
}

output "secret_ids" {
  value = {
    for k, v in aws_secretsmanager_secret.app : k => v.id
  }
}
