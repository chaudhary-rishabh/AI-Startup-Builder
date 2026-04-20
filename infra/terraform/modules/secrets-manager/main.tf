locals {
  secret_names = [
    "jwt-keys",
    "db-credentials",
    "stripe-keys",
    "anthropic-key",
    "openai-key",
    "resend-key",
    "pinecone-key",
    "grafana-admin",
  ]
}

resource "aws_secretsmanager_secret" "app" {
  for_each = toset(local.secret_names)

  name                    = "${var.name_prefix}/${each.value}"
  recovery_window_in_days = 7

  tags = merge(var.tags, { Name = each.value })
}

resource "aws_secretsmanager_secret_version" "placeholder" {
  for_each = aws_secretsmanager_secret.app

  secret_id     = each.value.id
  secret_string = jsonencode({ note = "Populate via CI or admin tooling" })
}
