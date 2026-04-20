terraform {
  backend "s3" {
    bucket         = "ai-startup-tfstate"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "ai-startup-tflock"
    encrypt        = true
  }
}
