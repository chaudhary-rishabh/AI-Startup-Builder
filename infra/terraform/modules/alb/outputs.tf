output "alb_dns_name" {
  value       = aws_lb.this.dns_name
  description = "ALB DNS name"
}

output "alb_zone_id" {
  value       = aws_lb.this.zone_id
  description = "ALB hosted zone ID for alias records"
}

output "target_group_arns" {
  value       = { for k, v in aws_lb_target_group.services : k => v.arn }
  description = "Map of service name to target group ARN"
}

output "alb_arn" {
  value       = aws_lb.this.arn
  description = "ALB ARN"
}

output "alb_arn_suffix" {
  value       = aws_lb.this.arn_suffix
  description = "ALB ARN suffix for CloudWatch dimensions"
}

output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "ALB security group ID"
}
