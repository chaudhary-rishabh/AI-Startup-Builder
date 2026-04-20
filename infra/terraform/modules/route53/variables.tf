variable "zone_id" {
  type        = string
  description = "Route53 hosted zone ID"
}

variable "record_name" {
  type        = string
  description = "FQDN for API, e.g. api.aistartupbuilder.com"
  default     = "api.aistartupbuilder.com"
}

variable "alb_dns_name" {
  type = string
}

variable "alb_zone_id" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
