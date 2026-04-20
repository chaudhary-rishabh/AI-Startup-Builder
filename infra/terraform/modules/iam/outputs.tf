output "irsa_role_arns" {
  value = {
    for k, v in aws_iam_role.service : k => v.arn
  }
  description = "Map service name to IRSA role ARN"
}

output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "IAM role ARN for GitHub Actions OIDC"
}
