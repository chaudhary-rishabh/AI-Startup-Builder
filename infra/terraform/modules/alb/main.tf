locals {
  services = {
    api-gateway            = { port = 4000, path = "/api/v1/*" }
    auth-service           = { port = 8080, path = "/api/v1/auth/*" }
    user-service           = { port = 8080, path = "/api/v1/users/*" }
    project-service        = { port = 8080, path = "/api/v1/projects/*" }
    ai-service             = { port = 8080, path = "/api/v1/ai/*" }
    rag-service            = { port = 8080, path = "/api/v1/rag/*" }
    billing-service        = { port = 8080, path = "/api/v1/billing/*" }
    notification-service   = { port = 8080, path = "/api/v1/notifications/*" }
    analytics-service      = { port = 8080, path = "/api/v1/analytics/*" }
  }

  rule_priority = {
    auth-service         = 10
    user-service         = 20
    project-service      = 30
    ai-service           = 40
    rag-service          = 50
    billing-service      = 60
    notification-service = 70
    analytics-service    = 80
  }
}

resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb"
  description = "Public ALB"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-alb" })
}

resource "aws_lb" "this" {
  name               = "${var.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  tags = merge(var.tags, { Name = "${var.name_prefix}-alb" })
}

resource "aws_lb_target_group" "services" {
  for_each = local.services

  name        = substr("${var.name_prefix}-${replace(each.key, "-", "")}", 0, 32)
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-tg-${each.key}" })
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["api-gateway"].arn
  }
}

resource "aws_lb_listener_rule" "services" {
  for_each = { for k, v in local.services : k => v if k != "api-gateway" }

  listener_arn = aws_lb_listener.https.arn
  priority     = local.rule_priority[each.key]

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services[each.key].arn
  }

  condition {
    path_pattern {
      values = [each.value.path]
    }
  }
}
