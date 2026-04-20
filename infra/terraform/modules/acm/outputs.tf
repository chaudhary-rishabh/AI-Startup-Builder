output "certificate_arn" {
  value       = aws_acm_certificate.wildcard.arn
  description = "Validated ACM certificate ARN (same region as provider)"
}

output "certificate_domain_name" {
  value       = aws_acm_certificate.wildcard.domain_name
  description = "Primary domain on certificate"
}
