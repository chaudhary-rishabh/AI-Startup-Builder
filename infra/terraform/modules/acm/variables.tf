variable "domain_name" {
  type        = string
  description = "Primary ACM domain name (apex recommended)"
  default     = "aistartupbuilder.com"
}

variable "subject_alternative_names" {
  type        = list(string)
  description = "Additional SANs (e.g. wildcard)"
  default     = ["*.aistartupbuilder.com"]
}

variable "route53_zone_id" {
  type        = string
  description = "Public hosted zone ID for DNS validation"
}

variable "tags" {
  type    = map(string)
  default = {}
}
