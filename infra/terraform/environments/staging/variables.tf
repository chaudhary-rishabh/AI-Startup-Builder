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
  default = "10.1.0.0/16"
}

variable "route53_zone_id" {
  type        = string
  description = "Public hosted zone ID for aistartupbuilder.com"
}

variable "github_org_repo" {
  type = string
}

variable "cloudfront_aliases" {
  type    = list(string)
  default = []
}
