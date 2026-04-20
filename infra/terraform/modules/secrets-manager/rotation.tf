data "archive_file" "db_rotation" {
  count = var.enable_db_rotation && var.rds_secret_arn != "" && length(var.vpc_subnet_ids) > 0 ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/build/db_rotation.zip"
  source {
    content  = file("${path.module}/lambda/db_rotation.py")
    filename = "db_rotation.py"
  }
}

resource "aws_iam_role" "rotation_lambda" {
  count = var.enable_db_rotation && var.rds_secret_arn != "" && length(var.vpc_subnet_ids) > 0 ? 1 : 0
  name  = "${var.name_prefix}-db-rotation"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rotation_lambda_basic" {
  count      = length(aws_iam_role.rotation_lambda) > 0 ? 1 : 0
  role       = aws_iam_role.rotation_lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "rotation_secrets" {
  count = length(aws_iam_role.rotation_lambda) > 0 ? 1 : 0
  name  = "${var.name_prefix}-db-rotation-secrets"
  role  = aws_iam_role.rotation_lambda[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:UpdateSecretVersionStage",
        ]
        Resource = [var.rds_secret_arn]
      },
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "db_rotation" {
  count = var.enable_db_rotation && var.rds_secret_arn != "" && length(var.vpc_subnet_ids) > 0 ? 1 : 0

  function_name = "${var.name_prefix}-db-rotation"
  role          = aws_iam_role.rotation_lambda[0].arn
  handler       = "db_rotation.lambda_handler"
  runtime       = "python3.12"
  timeout       = 60

  filename         = data.archive_file.db_rotation[0].output_path
  source_code_hash = data.archive_file.db_rotation[0].output_base64sha256

  vpc_config {
    subnet_ids         = var.vpc_subnet_ids
    security_group_ids = var.vpc_security_group_ids
  }

  environment {
    variables = {
      SECRET_ARN = var.rds_secret_arn
    }
  }

  tags = var.tags
}

resource "aws_lambda_permission" "allow_secretsmanager" {
  count = length(aws_lambda_function.db_rotation) > 0 ? 1 : 0

  statement_id  = "AllowSecretsManagerInvoke"
  action          = "lambda:InvokeFunction"
  function_name   = aws_lambda_function.db_rotation[0].function_name
  principal       = "secretsmanager.amazonaws.com"
  source_arn      = var.rds_secret_arn
}

resource "aws_secretsmanager_secret_rotation" "db" {
  count = length(aws_lambda_function.db_rotation) > 0 ? 1 : 0

  secret_id           = var.rds_secret_arn
  rotation_lambda_arn = aws_lambda_function.db_rotation[0].arn

  rotation_rules {
    automatically_after_days = 30
  }
}
