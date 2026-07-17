# [VULN-T1] Terraform — Security Group Open to the World

**Caught by:** Checkov (IaC scan)
**Files:** `terraform-ec2/main.tf`

## The problem

SSH (port 22) is open to `0.0.0.0/0` — the entire internet can reach the
login port and brute-force it. This is one of the most common and most
dangerous cloud misconfigurations, and Checkov flags it by default.

### Before (vulnerable)

```hcl
ingress {
  description = "SSH"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]   # <-- open to the world
}
```

## The fix

Restrict SSH to a known admin IP/CIDR (or, better, remove inbound SSH
entirely and use AWS SSM Session Manager). Keep only the app port public.

### After (fixed)

```hcl
variable "trusted_admin_cidr" {
  description = "IP/CIDR allowed to SSH in, e.g. 203.0.113.4/32"
  type        = string
}

ingress {
  description = "SSH from trusted admin IP only"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = [var.trusted_admin_cidr]
}

# App stays public so customers (and the ZAP scan) can reach it.
ingress {
  description = "App HTTP"
  from_port   = 3000
  to_port     = 3000
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}
```

**Even better — no inbound SSH at all:**

```hcl
# Drop the port-22 rule entirely and attach an instance profile with
# AmazonSSMManagedInstanceCore. Then connect with:
#   aws ssm start-session --target <instance-id>
# No open SSH port, full audit log, IAM-controlled access.
```

## Why it works

- **Scoping the CIDR** shrinks the attack surface from "the whole internet"
  to "one address."
- **SSM Session Manager** removes the open port completely and gives you
  IAM-based access with CloudTrail logging — the strongest option.
- What Checkov *didn't* flag is worth noting: IMDSv2 and root-volume
  encryption were already set correctly in the Terraform. Good defaults
  matter.

## Rule of thumb

`0.0.0.0/0` on anything other than a genuinely public port (80/443, or here
3000 for the demo) is almost always a finding. Management ports (22, 3389,
database ports) should never be world-open.
