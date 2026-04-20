output "cidr_block" {
  value       = aws_vpc.this.cidr_block
  description = "VPC CIDR"
}

output "vpc_id" {
  value       = aws_vpc.this.id
  description = "VPC ID"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "Private subnet IDs (EKS + RDS)"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "Public subnet IDs (ALB)"
}

output "nat_gateway_ids" {
  value       = aws_nat_gateway.this[*].id
  description = "NAT gateway IDs"
}

output "azs" {
  value       = local.azs
  description = "AZs used"
}
