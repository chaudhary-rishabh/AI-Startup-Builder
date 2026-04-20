variable "name_prefix" {
  type        = string
  description = "Prefix for resource names"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "VPC CIDR block"
}

variable "azs" {
  type        = list(string)
  description = "Availability zones (3 for HA)"
}

variable "single_nat_gateway" {
  type        = bool
  description = "If true, one shared NAT (dev/staging). If false, one NAT per AZ (prod)."
  default     = true
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Common tags"
}

variable "eks_cluster_name" {
  type        = string
  default     = ""
  description = "If set, subnets are tagged for this EKS cluster"
}
