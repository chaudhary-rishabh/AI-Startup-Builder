locals {
  services = [
    "api-gateway",
    "auth-service",
    "user-service",
    "project-service",
    "ai-service",
    "rag-service",
    "billing-service",
    "notification-service",
    "analytics-service",
  ]

  issuer_host = replace(var.eks_oidc_issuer_url, "https://", "")

  service_secret_keys = {
    api-gateway = ["jwt-keys", "db-credentials"]
    auth-service = [
      "jwt-keys",
      "db-credentials",
    ]
    user-service = ["jwt-keys", "db-credentials"]
    project-service = ["jwt-keys", "db-credentials"]
    ai-service = ["anthropic-key", "db-credentials", "openai-key"]
    rag-service = ["pinecone-key", "openai-key", "db-credentials"]
    billing-service = ["stripe-keys", "db-credentials"]
    notification-service = ["resend-key", "db-credentials"]
    analytics-service = ["db-credentials", "openai-key"]
  }
}

data "aws_iam_policy_document" "assume_irsa" {
  for_each = toset(local.services)

  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRoleWithWebIdentity",
    ]
    principals {
      type        = "Federated"
      identifiers = [var.eks_oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.issuer_host}:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.issuer_host}:sub"
      values   = ["system:serviceaccount:${var.k8s_namespace}:${each.value}-sa"]
    }
  }
}

resource "aws_iam_role" "service" {
  for_each = toset(local.services)

  name               = "${var.name_prefix}-${each.value}-irsa"
  assume_role_policy = data.aws_iam_policy_document.assume_irsa[each.value].json

  tags = merge(var.tags, { Service = each.value })
}

data "aws_iam_policy_document" "service_policy" {
  for_each = toset(local.services)

  dynamic "statement" {
    for_each = length(compact([
      for key in local.service_secret_keys[each.value] : try(var.secret_arns[key], "")
    ])) > 0 ? [1] : []
    content {
      sid    = "SecretsRead"
      effect = "Allow"
      actions = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
      ]
      resources = compact([
        for key in local.service_secret_keys[each.value] : try(var.secret_arns[key], "")
      ])
    }
  }

  dynamic "statement" {
    for_each = each.value == "ai-service" ? [1] : []
    content {
      sid    = "UserUploadsS3"
      effect = "Allow"
      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
      ]
      resources = compact([
        try(var.s3_bucket_arns["user_uploads"], ""),
        "${try(var.s3_bucket_arns["user_uploads"], "")}/*",
      ])
    }
  }
}

resource "aws_iam_role_policy" "service_inline" {
  for_each = toset(local.services)

  name = "${var.name_prefix}-${each.value}-inline"
  role = aws_iam_role.service[each.value].id

  policy = data.aws_iam_policy_document.service_policy[each.value].json
}
