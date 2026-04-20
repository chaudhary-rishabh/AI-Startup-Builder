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
  description = "CIDR allowed to reach Redis (typically VPC CIDR)"
  default     = "10.0.0.0/16"
}

variable "node_type" {
  type    = string
  default = "cache.r6g.large"
}

variable "engine_version" {
  type    = string
  default = "7.1"
}

variable "num_shards" {
  type        = number
  default     = 3
  description = "Number of shards (node groups)"
}

variable "replicas_per_shard" {
  type        = number
  default     = 2
  description = "Replicas per shard"
}

variable "tags" {
  type    = map(string)
  default = {}
}
