variable "name_prefix" {
  type = string
}

variable "static_assets_bucket_id" {
  type        = string
  description = "S3 bucket for static assets origin"
}

variable "static_assets_bucket_arn" {
  type = string
}

variable "api_origin_domain" {
  type        = string
  description = "ALB DNS name for API origin"
}

variable "aliases" {
  type        = list(string)
  default     = []
  description = "Alternate domain names (e.g. app.aistartupbuilder.com)"
}

variable "acm_certificate_arn_us_east_1" {
  type        = string
  description = "ACM cert in us-east-1 for CloudFront (must be in us-east-1)"
}

variable "tags" {
  type    = map(string)
  default = {}
}
