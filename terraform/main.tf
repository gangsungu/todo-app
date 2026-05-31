terraform {
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

# k6 러너 전용 보안 그룹
resource "aws_security_group" "k6_runner" {
  name        = "k6-runner-sg"
  description = "k6 load test runner"
  vpc_id      = var.vpc_id

  # SSH 접속 (결과 확인용)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # 아웃바운드 전체 허용 (앱 서버로 트래픽 발생)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "k6-runner-sg"
    Purpose = "load-test"
  }
}

# k6 러너 EC2
resource "aws_instance" "k6_runner" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.k6_runner.id]
  key_name               = var.key_name

  user_data = templatefile("${path.module}/user_data.sh", {
    target_host  = var.app_host
    k6_scripts   = var.k6_scripts_path
  })

  tags = {
    Name    = "k6-runner"
    Purpose = "load-test"
  }
}
