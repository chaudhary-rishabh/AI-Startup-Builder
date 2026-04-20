output "cluster_endpoint" {
  value       = aws_eks_cluster.this.endpoint
  description = "EKS API endpoint"
}

output "cluster_ca" {
  value       = aws_eks_cluster.this.certificate_authority[0].data
  description = "Base64 cluster CA certificate"
}

output "node_role_arn" {
  value       = aws_iam_role.node.arn
  description = "Managed node group IAM role ARN"
}

output "cluster_name" {
  value       = aws_eks_cluster.this.name
  description = "EKS cluster name"
}

output "cluster_arn" {
  value       = aws_eks_cluster.this.arn
  description = "EKS cluster ARN"
}

output "cluster_security_group_id" {
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
  description = "Cluster security group attached to control plane / worker ENIs"
}

output "oidc_provider_arn" {
  value       = aws_iam_openid_connect_provider.eks.arn
  description = "OIDC provider ARN for IRSA"
}

output "oidc_issuer_url" {
  value       = aws_iam_openid_connect_provider.eks.url
  description = "OIDC issuer URL"
}

output "karpenter_node_role_name" {
  value       = try(aws_iam_role.karpenter_node[0].name, null)
  description = "IAM role name for Karpenter-provisioned nodes (EC2NodeClass.spec.role)"
}

output "karpenter_controller_role_arn" {
  value       = try(aws_iam_role.karpenter[0].arn, null)
  description = "IRSA role ARN for the Karpenter controller (Helm serviceAccount annotation)"
}
