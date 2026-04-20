output "primary_id" {
  value       = aws_db_instance.primary.identifier
  description = "Primary RDS instance identifier"
}

output "primary_endpoint" {
  value       = aws_db_instance.primary.address
  description = "Primary PostgreSQL endpoint"
}

output "replica_endpoint" {
  value       = try(aws_db_instance.replica[0].address, null)
  description = "Read replica endpoint"
}

output "primary_port" {
  value       = aws_db_instance.primary.port
  description = "PostgreSQL port"
}

output "db_security_group_id" {
  value       = aws_security_group.this.id
  description = "RDS security group ID"
}

output "master_secret_arn" {
  value       = try(aws_db_instance.primary.master_user_secret[0].secret_arn, null)
  description = "Secrets Manager ARN for master credentials (when manage_master_user_password)"
  sensitive   = true
}
