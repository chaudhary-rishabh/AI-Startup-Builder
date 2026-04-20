output "configuration_endpoint" {
  value       = aws_elasticache_replication_group.this.configuration_endpoint_address
  description = "Cluster configuration endpoint (Redis cluster mode)"
}

output "primary_endpoint" {
  value       = coalesce(aws_elasticache_replication_group.this.primary_endpoint_address, aws_elasticache_replication_group.this.configuration_endpoint_address)
  description = "Primary / configuration endpoint"
}

output "auth_token_secret_hint" {
  value       = "Auth token stored in Terraform state via random_password; copy to Secrets Manager redis-auth in parent stack."
  description = "Operational hint"
  sensitive   = false
}
