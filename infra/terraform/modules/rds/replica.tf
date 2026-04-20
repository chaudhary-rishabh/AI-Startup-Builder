resource "aws_db_instance" "replica" {
  count = var.enable_read_replica ? 1 : 0

  identifier = "${var.name_prefix}-pg-replica"

  replicate_source_db = aws_db_instance.primary.identifier

  instance_class = var.instance_class

  storage_encrypted = true

  multi_az            = false
  publicly_accessible = false

  vpc_security_group_ids = [aws_security_group.this.id]

  deletion_protection = var.deletion_protection
  skip_final_snapshot = !var.deletion_protection

  performance_insights_enabled = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-pg-replica" })
}
