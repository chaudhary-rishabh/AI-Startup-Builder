locals {
  buckets = {
    user_uploads = "${var.name_prefix}-user-uploads"
    project_exports = "${var.name_prefix}-project-exports"
    static_assets   = "${var.name_prefix}-static-assets"
  }
}

resource "aws_s3_bucket" "user_uploads" {
  bucket = local.buckets.user_uploads
  tags     = merge(var.tags, { Name = local.buckets.user_uploads })
}

resource "aws_s3_bucket_versioning" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "user_uploads" {
  bucket                  = aws_s3_bucket.user_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "project_exports" {
  bucket = local.buckets.project_exports
  tags     = merge(var.tags, { Name = local.buckets.project_exports })
}

resource "aws_s3_bucket_versioning" "project_exports" {
  bucket = aws_s3_bucket.project_exports.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "project_exports" {
  bucket = aws_s3_bucket.project_exports.id

  rule {
    id     = "archive-old-versions"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "project_exports" {
  bucket = aws_s3_bucket.project_exports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "project_exports" {
  bucket                  = aws_s3_bucket.project_exports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "static_assets" {
  bucket = local.buckets.static_assets
  tags     = merge(var.tags, { Name = local.buckets.static_assets })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket                  = aws_s3_bucket.static_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
