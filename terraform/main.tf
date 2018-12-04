provider "aws" {
  region = "eu-west-1"
}

variable "cluster-name" {
  default = "stream_service_cluster"
  type    = "string"
}

data "aws_availability_zones" "available" {}

resource "aws_ecr_repository" "stream_service_registry" {
  name = "stream_service_registry"
}

resource "aws_vpc" "stream_service_vpc" {
  cidr_block = "10.0.0.0/16"

  tags = "${
    map(
     "Name", "stream_service_cluster_node",
     "kubernetes.io/cluster/${var.cluster-name}", "shared",
    )
  }"
}

resource "aws_subnet" "stream_service_subnet" {
  count = 2

  availability_zone = "${data.aws_availability_zones.available.names[count.index]}"
  cidr_block        = "10.0.${count.index}.0/24"
  vpc_id            = "${aws_vpc.stream_service_vpc.id}"

  tags = "${
    map(
     "Name", "stream_service_cluster_node",
     "kubernetes.io/cluster/${var.cluster-name}", "shared",
    )
  }"
}

resource "aws_internet_gateway" "stream_service_gateway" {
  vpc_id = "${aws_vpc.stream_service_vpc.id}"

  tags {
    Name = "stream_service_gateway"
  }
}

resource "aws_route_table" "stream_service_routes" {
  vpc_id = "${aws_vpc.stream_service_vpc.id}"

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.stream_service_gateway.id}"
  }
}

resource "aws_route_table_association" "stream_service_route_association" {
  count = 2

  subnet_id      = "${aws_subnet.stream_service_subnet.*.id[count.index]}"
  route_table_id = "${aws_route_table.stream_service_routes.id}"
}

resource "aws_iam_role" "stream_service_iam" {
  name = "stream_service_cluster_iam"

  assume_role_policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "eks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "stream_service_AmazonEKSClusterPolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = "${aws_iam_role.stream_service_iam.name}"
}

resource "aws_iam_role_policy_attachment" "stream_service_AmazonEKSServicePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  role       = "${aws_iam_role.stream_service_iam.name}"
}

resource "aws_security_group" "stream_service_sg" {
  name        = "stream_service_sg"
  description = "Cluster communication with worker nodes"
  vpc_id      = "${aws_vpc.stream_service_vpc.id}"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags {
    Name = "stream_service_cluster"
  }
}

resource "aws_eks_cluster" "stream_service_cluster" {
  name            = "${var.cluster-name}"
  role_arn        = "${aws_iam_role.stream_service_iam.arn}"

  vpc_config {
    security_group_ids = ["${aws_security_group.stream_service_sg.id}"]
    subnet_ids         = ["${aws_subnet.stream_service_subnet.*.id}"]
  }

  depends_on = [
    "aws_iam_role_policy_attachment.stream_service_AmazonEKSClusterPolicy",
    "aws_iam_role_policy_attachment.stream_service_AmazonEKSServicePolicy",
  ]
}

resource "aws_iam_role" "stream_cluster_node" {
  name = "stream_cluster_node"

  assume_role_policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "stream_cluster_node_AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = "${aws_iam_role.stream_cluster_node.name}"
}

resource "aws_iam_role_policy_attachment" "stream_cluster_node_AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = "${aws_iam_role.stream_cluster_node.name}"
}

resource "aws_iam_role_policy_attachment" "stream_cluster_node_AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = "${aws_iam_role.stream_cluster_node.name}"
}

resource "aws_iam_instance_profile" "stream_cluster_node_profile" {
  name = "stream_cluster_node_profile"
  role = "${aws_iam_role.stream_cluster_node.name}"
}

resource "aws_security_group" "stream_service_node_sg" {
  name        = "stream_service_node_sg"
  description = "Security group for all nodes in the cluster"
  vpc_id      = "${aws_vpc.stream_service_vpc.id}"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = "${
    map(
     "Name", "stream_service_node",
     "kubernetes.io/cluster/${var.cluster-name}", "owned",
    )
  }"
}

resource "aws_security_group_rule" "stream_service_node_sg_self" {
  description              = "Allow node to communicate with each other"
  from_port                = 0
  protocol                 = "-1"
  security_group_id        = "${aws_security_group.stream_service_node_sg.id}"
  source_security_group_id = "${aws_security_group.stream_service_node_sg.id}"
  to_port                  = 65535
  type                     = "ingress"
}

resource "aws_security_group_rule" "stream_service_node_sg_cluster" {
  description              = "Allow worker Kubelets and pods to receive communication from the cluster control plane"
  from_port                = 1025
  protocol                 = "tcp"
  security_group_id        = "${aws_security_group.stream_service_node_sg.id}"
  source_security_group_id = "${aws_security_group.stream_service_sg.id}"
  to_port                  = 65535
  type                     = "ingress"
}

resource "aws_security_group_rule" "stream_service_cluster_ingress_node_https" {
  description              = "Allow pods to communicate with the cluster API Server"
  from_port                = 443
  protocol                 = "tcp"
  security_group_id        = "${aws_security_group.stream_service_sg.id}"
  source_security_group_id = "${aws_security_group.stream_service_node_sg.id}"
  to_port                  = 443
  type                     = "ingress"
}

data "aws_ami" "eks-worker" {
  filter {
    name   = "name"
    values = ["amazon-eks-node-v*"]
  }

  most_recent = true
  owners      = ["602401143452"] # Amazon EKS AMI Account ID
}

data "aws_region" "current" {}

locals {
  stream_service_userdata = <<USERDATA
#!/bin/bash
set -o xtrace
/etc/eks/bootstrap.sh --apiserver-endpoint '${aws_eks_cluster.stream_service_cluster.endpoint}' --b64-cluster-ca '${aws_eks_cluster.stream_service_cluster.certificate_authority.0.data}' '${var.cluster-name}'
USERDATA
}

resource "aws_launch_configuration" "stream_service_launch_config" {
  associate_public_ip_address = true
  iam_instance_profile        = "${aws_iam_instance_profile.stream_cluster_node_profile.name}"
  image_id                    = "${data.aws_ami.eks-worker.id}"
  instance_type               = "m5.large"
  name_prefix                 = "stream_service_node"
  security_groups             = ["${aws_security_group.stream_service_node_sg.id}"]
  user_data_base64            = "${base64encode(local.stream_service_userdata)}"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "stream_service_node_autoscaler" {
  desired_capacity     = 2
  launch_configuration = "${aws_launch_configuration.stream_service_launch_config.id}"
  max_size             = 2
  min_size             = 1
  name                 = "stream_service_node_autoscaler"
  vpc_zone_identifier  = ["${aws_subnet.stream_service_subnet.*.id}"]

  tag {
    key                 = "Name"
    value               = "stream_service_node"
    propagate_at_launch = true
  }

  tag {
    key                 = "kubernetes.io/cluster/${var.cluster-name}"
    value               = "owned"
    propagate_at_launch = true
  }
}

locals {
  kubeconfig = <<KUBECONFIG


apiVersion: v1
clusters:
- cluster:
    server: ${aws_eks_cluster.stream_service_cluster.endpoint}
    certificate-authority-data: ${aws_eks_cluster.stream_service_cluster.certificate_authority.0.data}
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: aws
  name: aws
current-context: aws
kind: Config
preferences: {}
users:
- name: aws
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws-iam-authenticator
      args:
        - "token"
        - "-i"
        - "${var.cluster-name}"
KUBECONFIG
}

output "kubeconfig" {
  value = "${local.kubeconfig}"
}

locals {
  stream_service_config_map_aws_auth = <<CONFIGMAPAWSAUTH


apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: ${aws_iam_role.stream_cluster_node.arn}
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
CONFIGMAPAWSAUTH
}

output "stream_service_config_map_aws_auth" {
  value = "${local.stream_service_config_map_aws_auth}"
}
