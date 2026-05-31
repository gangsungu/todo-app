variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "vpc_id" {
  description = "앱 EC2와 동일한 VPC ID"
  type        = string
}

variable "subnet_id" {
  description = "k6 러너를 배치할 서브넷 ID (앱 EC2와 같은 VPC 내)"
  type        = string
}

variable "ami_id" {
  description = "Amazon Linux 2023 AMI ID (리전별로 다름)"
  type        = string
  # ap-northeast-2 기준 Amazon Linux 2023 최신 AMI
  default     = "ami-05d2438ca66594916"
}

variable "instance_type" {
  description = "k6 러너 인스턴스 타입 (VU 100 기준 t3.medium 충분)"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "EC2 SSH 키페어 이름"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "SSH 허용할 IP 대역 (내 IP/32)"
  type        = string
}

variable "app_host" {
  description = "테스트 대상 앱 서버 Private IP 또는 DNS"
  type        = string
}

variable "k6_scripts_path" {
  description = "로컬 k6 스크립트 경로 (user_data에서 참조용)"
  type        = string
  default     = "../k6"
}
