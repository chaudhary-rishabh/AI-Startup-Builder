variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN for HTTPS listener"
}

variable "enable_waf" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
