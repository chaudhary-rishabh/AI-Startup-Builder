provider "aws" {
  region = var.aws_region
}

locals {
  name_prefix = "aistartup-${var.env}"

  # Deterministic ARNs so IAM can be provisioned without a circular dependency on the S3 module policies.
  s3_bucket_arns = {
    user_uploads    = "arn:aws:s3:::${local.name_prefix}-user-uploads"
    project_exports = "arn:aws:s3:::${local.name_prefix}-project-exports"
    static_assets   = "arn:aws:s3:::${local.name_prefix}-static-assets"
  }
}

module "vpc" {
  source = "../../modules/vpc"

  name_prefix        = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  azs                = var.azs
  single_nat_gateway = true
  eks_cluster_name   = local.name_prefix

  tags = { Environment = var.env, Project = "ai-startup-builder" }
}

module "acm" {
  source = "../../modules/acm"

  domain_name               = "aistartupbuilder.com"
  subject_alternative_names = ["*.aistartupbuilder.com"]
  route53_zone_id           = var.route53_zone_id
  tags                      = { Environment = var.env, Project = "ai-startup-builder" }
}

module "eks" {
  source = "../../modules/eks"

  name_prefix         = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  node_instance_types = ["m6i.xlarge"]
  node_min_size       = 1
  node_max_size       = 5
  node_desired_size   = 2
  enable_karpenter    = true

  tags = { Environment = var.env, Project = "ai-startup-builder" }
}

module "ecr" {
  source = "../../modules/ecr"

  name_prefix = local.name_prefix
  tags        = { Environment = var.env, Project = "ai-startup-builder" }
}

module "rds" {
  source = "../../modules/rds"

  name_prefix         = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  ingress_cidr        = module.vpc.cidr_block
  instance_class      = "db.t4g.medium"
  multi_az            = false
  deletion_protection = false
  enable_read_replica = false

  tags = { Environment = var.env, Project = "ai-startup-builder" }
}

module "elasticache" {
  source = "../../modules/elasticache"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  ingress_cidr       = module.vpc.cidr_block
  node_type          = "cache.t4g.micro"
  num_shards         = 1
  replicas_per_shard = 0

  tags = { Environment = var.env, Project = "ai-startup-builder" }
}

module "secrets" {
  source = "../../modules/secrets-manager"

  name_prefix = local.name_prefix

  rds_secret_arn         = module.rds.master_secret_arn
  vpc_subnet_ids         = module.vpc.private_subnet_ids
  vpc_security_group_ids = []
  enable_db_rotation     = false

  tags = { Environment = var.env, Project = "ai-startup-builder" }

  depends_on = [module.rds]
}

module "iam" {
  source = "../../modules/iam"

  name_prefix           = local.name_prefix
  eks_oidc_provider_arn = module.eks.oidc_provider_arn
  eks_oidc_issuer_url   = module.eks.oidc_issuer_url
  secret_arns           = module.secrets.secret_arns
  s3_bucket_arns        = local.s3_bucket_arns
  github_org_repo       = var.github_org_repo
  eks_cluster_arn       = module.eks.cluster_arn
  ecr_repository_arns   = values(module.ecr.repository_arns)

  tags = { Environment = var.env, Project = "ai-startup-builder" }

  depends_on = [module.eks, module.secrets, module.ecr]
}

module "s3" {
  source = "../../modules/s3"

  name_prefix = local.name_prefix

  irsa_role_arns_by_bucket = {
    user_uploads = compact([
      try(module.iam.irsa_role_arns["ai-service"], ""),
    ])
    project_exports = compact([
      try(module.iam.irsa_role_arns["project-service"], ""),
    ])
    static_assets = compact([
      try(module.iam.irsa_role_arns["api-gateway"], ""),
    ])
  }

  tags = { Environment = var.env, Project = "ai-startup-builder" }

  depends_on = [module.iam]
}

module "alb" {
  source = "../../modules/alb"

  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = module.acm.certificate_arn
  enable_waf        = false

  tags = { Environment = var.env, Project = "ai-startup-builder" }

  depends_on = [module.acm]
}

module "route53" {
  source = "../../modules/route53"

  zone_id      = var.route53_zone_id
  record_name  = "api.aistartupbuilder.com"
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id  = module.alb.alb_zone_id

  tags = { Environment = var.env, Project = "ai-startup-builder" }

  depends_on = [module.alb]
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  name_prefix                   = local.name_prefix
  static_assets_bucket_id       = module.s3.static_assets_bucket_name
  static_assets_bucket_arn        = module.s3.static_assets_bucket_arn
  api_origin_domain               = module.alb.alb_dns_name
  aliases                         = var.cloudfront_aliases
  acm_certificate_arn_us_east_1   = module.acm.certificate_arn

  tags = { Environment = var.env, Project = "ai-startup-builder" }

  depends_on = [module.s3, module.alb, module.acm]
}
