output "api_record_fqdn" {
  value       = aws_route53_record.api_alias.fqdn
  description = "FQDN of the API alias record"
}

output "health_check_id" {
  value       = aws_route53_health_check.api.id
  description = "Route53 health check ID"
}
