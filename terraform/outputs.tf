output "k6_runner_public_ip" {
  description = "k6 러너 EC2 퍼블릭 IP (SSH 접속용)"
  value       = aws_instance.k6_runner.public_ip
}

output "k6_runner_private_ip" {
  description = "k6 러너 EC2 프라이빗 IP"
  value       = aws_instance.k6_runner.private_ip
}

output "k6_runner_id" {
  description = "k6 러너 EC2 인스턴스 ID"
  value       = aws_instance.k6_runner.id
}
