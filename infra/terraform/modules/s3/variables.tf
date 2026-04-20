variable "name_prefix" {
  type = string
}

variable "irsa_role_arns_by_bucket" {
  type        = map(list(string))
  description = "Map bucket key -> list of IAM role ARNs allowed (GetObject/PutObject) via IRSA"
  default     = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
