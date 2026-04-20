data "aws_iam_policy_document" "user_uploads" {
  count = length(try(var.irsa_role_arns_by_bucket["user_uploads"], [])) > 0 ? 1 : 0

  statement {
    sid    = "IRSAObjectAccess"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = var.irsa_role_arns_by_bucket["user_uploads"]
    }
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.user_uploads.arn,
      "${aws_s3_bucket.user_uploads.arn}/*",
    ]
  }
}

resource "aws_s3_bucket_policy" "user_uploads" {
  count  = length(try(var.irsa_role_arns_by_bucket["user_uploads"], [])) > 0 ? 1 : 0
  bucket = aws_s3_bucket.user_uploads.id
  policy = data.aws_iam_policy_document.user_uploads[0].json
}

data "aws_iam_policy_document" "project_exports" {
  count = length(try(var.irsa_role_arns_by_bucket["project_exports"], [])) > 0 ? 1 : 0

  statement {
    sid    = "IRSAObjectAccess"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = var.irsa_role_arns_by_bucket["project_exports"]
    }
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.project_exports.arn,
      "${aws_s3_bucket.project_exports.arn}/*",
    ]
  }
}

resource "aws_s3_bucket_policy" "project_exports" {
  count  = length(try(var.irsa_role_arns_by_bucket["project_exports"], [])) > 0 ? 1 : 0
  bucket = aws_s3_bucket.project_exports.id
  policy = data.aws_iam_policy_document.project_exports[0].json
}

data "aws_iam_policy_document" "static_assets" {
  count = length(try(var.irsa_role_arns_by_bucket["static_assets"], [])) > 0 ? 1 : 0

  statement {
    sid    = "IRSARead"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = var.irsa_role_arns_by_bucket["static_assets"]
    }
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.static_assets.arn,
      "${aws_s3_bucket.static_assets.arn}/*",
    ]
  }
}

resource "aws_s3_bucket_policy" "static_assets" {
  count  = length(try(var.irsa_role_arns_by_bucket["static_assets"], [])) > 0 ? 1 : 0
  bucket = aws_s3_bucket.static_assets.id
  policy = data.aws_iam_policy_document.static_assets[0].json
}
