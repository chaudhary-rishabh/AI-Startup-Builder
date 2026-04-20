variable "name_prefix" {
  type = string
}

variable "eks_oidc_provider_arn" {
  type = string
}

variable "eks_oidc_issuer_url" {
  type        = string
  description = "EKS OIDC issuer URL (https://...)"
}

variable "k8s_namespace" {
  type    = string
  default = "user-services"
}

variable "secret_arns" {
  type        = map(string)
  description = "Map logical secret key -> ARN (jwt-keys, stripe-keys, ...)"
  default     = {}
}

variable "s3_bucket_arns" {
  type        = map(string)
  description = "Map bucket key -> ARN for user_uploads, etc."
  default     = {}
}

variable "github_org_repo" {
  type        = string
  description = "GitHub org/repo for Actions OIDC, e.g. myorg/ai-startup-builder"
}

variable "eks_cluster_arn" {
  type        = string
  description = "EKS cluster ARN for GitHub deploy policy scoping"
}

variable "ecr_repository_arns" {
  type        = list(string)
  description = "ECR repository ARNs GitHub Actions may push to"
}

variable "tags" {
  type    = map(string)
  default = {}
}
