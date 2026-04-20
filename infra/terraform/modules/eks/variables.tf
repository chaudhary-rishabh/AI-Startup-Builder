variable "name_prefix" {
  type        = string
  description = "Resource name prefix / cluster name"
}

variable "vpc_id" {
  type        = string
}

variable "private_subnet_ids" {
  type        = list(string)
}

variable "kubernetes_version" {
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  type        = list(string)
  default     = ["m6i.xlarge"]
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 10
}

variable "node_desired_size" {
  type    = number
  default = 3
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "enable_karpenter" {
  type        = bool
  default     = true
  description = "Install Karpenter via Helm (requires network to cluster during apply)"
}
