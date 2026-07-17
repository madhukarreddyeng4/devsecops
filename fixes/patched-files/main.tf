# Terraform config for the Part 1 deployment target: a single EC2 instance
# running the VulnShop container via Docker Compose.
#
# NOTE: This is intentionally a SIMPLE setup for teaching purposes — no
# auto-scaling, no private container registry, no WAF in front of it.
# Part 2 of this series upgrades this exact workload to EKS with full
# Terraform modules (VPC, IRSA, ALB Controller) and adds AI-powered
# remediation on top of these same scan findings.
#
# [FIX-T1] Security group hardened: SSH is restricted to a trusted admin
# CIDR (var.trusted_admin_cidr) instead of 0.0.0.0/0. Only the app port
# stays public. Better still: drop SSH entirely and use SSM Session Manager.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# [FIX-T1] The one IP/CIDR allowed to SSH in. Set this in terraform.tfvars,
# e.g. trusted_admin_cidr = "203.0.113.4/32". (In the real repo this lives
# in variables.tf alongside the others.)
variable "trusted_admin_cidr" {
  description = "IP/CIDR allowed to SSH to the instance (e.g. 203.0.113.4/32)"
  type        = string
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_security_group" "vulnshop_sg" {
  name        = "vulnshop-sg"
  description = "Security group for VulnShop demo EC2 instance"

  ingress {
    description = "SSH from trusted admin IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.trusted_admin_cidr] # [FIX-T1] scoped, not 0.0.0.0/0
  }

  ingress {
    description = "App HTTP (public so customers + ZAP can reach it)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "vulnshop-sg"
    Project = "devsecops-tutorial"
  }
}

resource "aws_instance" "vulnshop_host" {
  ami                     = data.aws_ami.amazon_linux.id
  instance_type           = var.instance_type
  vpc_security_group_ids  = [aws_security_group.vulnshop_sg.id]
  key_name                = var.key_pair_name

  metadata_options {
    http_tokens   = "required" # enforce IMDSv2
    http_endpoint = "enabled"
  }

  root_block_device {
    encrypted = true
  }

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name    = "vulnshop-demo-host"
    Project = "devsecops-tutorial"
  }
}

output "instance_public_ip" {
  value = aws_instance.vulnshop_host.public_ip
}
