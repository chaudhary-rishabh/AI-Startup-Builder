variable "name_prefix" {
  type = string
}

variable "rds_secret_arn" {
  type        = string
  description = "Secrets Manager ARN for RDS master user (from RDS manage_master_user_password)"
  default     = ""
}

variable "vpc_subnet_ids" {
  type        = list(string)
  default     = []
  description = "Subnets for Lambda rotation ENIs"
}

variable "vpc_security_group_ids" {
  type        = list(string)
  default     = []
  description = "Security groups for Lambda rotation ENIs"
}

variable "enable_db_rotation" {
  type        = bool
  default     = false
  description = "Enable Lambda-based rotation for the RDS master secret"
}

variable "tags" {
  type    = map(string)
  default = {}
}
