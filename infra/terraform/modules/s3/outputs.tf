output "user_uploads_bucket_arn" {
  value = aws_s3_bucket.user_uploads.arn
}

output "user_uploads_bucket_name" {
  value = aws_s3_bucket.user_uploads.id
}

output "project_exports_bucket_arn" {
  value = aws_s3_bucket.project_exports.arn
}

output "project_exports_bucket_name" {
  value = aws_s3_bucket.project_exports.id
}

output "static_assets_bucket_arn" {
  value = aws_s3_bucket.static_assets.arn
}

output "static_assets_bucket_name" {
  value = aws_s3_bucket.static_assets.id
}

output "bucket_names" {
  value = {
    user_uploads    = aws_s3_bucket.user_uploads.id
    project_exports = aws_s3_bucket.project_exports.id
    static_assets   = aws_s3_bucket.static_assets.id
  }
}

output "bucket_arns" {
  value = {
    user_uploads    = aws_s3_bucket.user_uploads.arn
    project_exports = aws_s3_bucket.project_exports.arn
    static_assets   = aws_s3_bucket.static_assets.arn
  }
}
