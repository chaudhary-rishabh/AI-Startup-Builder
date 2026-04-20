resource "aws_route53_record" "api_alias" {
  zone_id = var.zone_id
  name    = var.record_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_health_check" "api" {
  fqdn              = var.record_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = merge(var.tags, { Name = "api-health" })

  depends_on = [aws_route53_record.api_alias]
}
