locals {
  karpenter_namespace = "karpenter"
}

resource "aws_iam_role" "karpenter" {
  count = var.enable_karpenter ? 1 : 0
  name  = "${var.name_prefix}-karpenter"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:${local.karpenter_namespace}:karpenter"
        }
      }
    }]
  })

  tags = var.tags
}

# IAM role + instance profile for nodes provisioned by Karpenter (referenced by EC2NodeClass)
resource "aws_iam_role" "karpenter_node" {
  count = var.enable_karpenter ? 1 : 0
  name  = "${var.name_prefix}-karpenter-node"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "karpenter_node_policies" {
  for_each = var.enable_karpenter ? toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ]) : toset([])

  policy_arn = each.value
  role       = aws_iam_role.karpenter_node[0].name
}

resource "aws_iam_instance_profile" "karpenter_node" {
  count = var.enable_karpenter ? 1 : 0
  name  = "${var.name_prefix}-karpenter-node"
  role  = aws_iam_role.karpenter_node[0].name
}

data "aws_iam_policy_document" "karpenter" {
  count = var.enable_karpenter ? 1 : 0

  statement {
    sid    = "KarpenterEC2"
    effect = "Allow"
    actions = [
      "ec2:CreateFleet",
      "ec2:RunInstances",
      "ec2:CreateLaunchTemplate",
      "ec2:CreateTags",
      "ec2:DescribeAvailabilityZones",
      "ec2:DescribeImages",
      "ec2:DescribeInstances",
      "ec2:DescribeInstanceTypes",
      "ec2:DescribeLaunchTemplates",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeSubnets",
      "ec2:DeleteLaunchTemplate",
      "ec2:TerminateInstances",
      "ssm:GetParameter",
      "pricing:GetProducts",
      "eks:DescribeCluster",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "KarpenterPassRole"
    effect = "Allow"
    actions = [
      "iam:PassRole",
    ]
    resources = [aws_iam_role.karpenter_node[0].arn]
  }
}

resource "aws_iam_role_policy" "karpenter" {
  count  = var.enable_karpenter ? 1 : 0
  name   = "${var.name_prefix}-karpenter"
  role   = aws_iam_role.karpenter[0].id
  policy = data.aws_iam_policy_document.karpenter[0].json
}
