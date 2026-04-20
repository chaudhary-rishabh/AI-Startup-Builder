variable "env" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "azs" {
  type = list(string)
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "route53_zone_id" {
  type        = string
  description = "Public hosted zone ID for aistartupbuilder.com"
}

variable "github_org_repo" {
  type        = string
  description = "GitHub org/repo allowed to deploy (OIDC), e.g. myorg/ai-startup-builder"
}

variable "cloudfront_aliases" {
  type        = list(string)
  default     = []
  description = "Optional CloudFront alternate domain names (requires ACM in us-east-1)"
}
