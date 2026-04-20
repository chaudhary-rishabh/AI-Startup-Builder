variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "ingress_cidr" {
  type        = string
  description = "CIDR allowed to reach PostgreSQL (typically VPC CIDR)"
  default     = "10.0.0.0/16"
}

variable "engine_version" {
  type    = string
  default = "16"
}

variable "instance_class" {
  type    = string
  default = "db.r6g.xlarge"
}

variable "allocated_storage" {
  type    = number
  default = 100
}

variable "multi_az" {
  type    = bool
  default = true
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "backup_retention_period" {
  type    = number
  default = 7
}

variable "database_name" {
  type    = string
  default = "aistartup"
}

variable "master_username" {
  type    = string
  default = "appadmin"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "enable_read_replica" {
  type        = bool
  default     = true
  description = "Create read replica (separate AZ) for analytics workloads"
}
