"""Attack type classification with CVSS 3.1 scoring and industry-standard signatures."""
import re
import hashlib
from typing import Dict, List, Tuple
from enum import Enum


class AttackType(Enum):
    """OWASP Top 10 + CWE attack classifications."""
    SQL_INJECTION = "A03:2021 – Injection"
    CROSS_SITE_SCRIPTING = "A07:2021 – Cross-Site Scripting (XSS)"
    BROKEN_AUTH = "A07:2021 – Identification and Authentication Failures"
    SENSITIVE_DATA_EXPOSURE = "A02:2021 – Cryptographic Failures"
    MALICIOUS_COMPONENTS = "A08:2021 – Software and Data Integrity Failures"
    BROKEN_ACCESS_CONTROL = "A01:2021 – Broken Access Control"
    SECURITY_MISCONFIGURATION = "A05:2021 – Security Misconfiguration"
    INSECURE_DESERIALIZATION = "A08:2021 – Deserialization of Untrusted Data"
    INSUFFICIENT_LOGGING = "A09:2021 – Logging and Monitoring Failures"
    VULNERABLE_DEPENDENCIES = "A06:2021 – Vulnerable and Outdated Components"
    DDoS_ATTACK = "Network Layer Attack"
    DATA_EXFILTRATION = "Data Leakage"
    MALWARE_INDICATOR = "Malware / C2"
    PATH_TRAVERSAL = "CWE-22 Path Traversal"
    COMMAND_INJECTION = "CWE-78 OS Command Injection"
    INFORMATION_DISCLOSURE = "Information Disclosure"
    NORMAL = "Normal Traffic"


class CVSSScore:
    """CVSS 3.1 base score calculator."""
    
    @staticmethod
    def calculate_base_score(attack_vector: str, attack_complexity: str, 
                            privileges_required: str, user_interaction: str,
                            scope: str, confidentiality: str, integrity: str,
                            availability: str) -> float:
        """Calculate CVSS 3.1 base score."""
        # Simplified implementation
        av_map = {"NETWORK": 0.85, "ADJACENT": 0.62, "LOCAL": 0.55, "PHYSICAL": 0.2}
        ac_map = {"LOW": 0.77, "HIGH": 0.44}
        pr_map = {"NONE": 0.85, "LOW": 0.62, "HIGH": 0.27}
        ui_map = {"NONE": 0.85, "REQUIRED": 0.62}
        scope_map = {"UNCHANGED": 0.0, "CHANGED": 0.15}
        impact_map = {"HIGH": 0.56, "LOW": 0.22, "NONE": 0.0}
        
        av = av_map.get(attack_vector, 0.85)
        ac = ac_map.get(attack_complexity, 0.77)
        pr = pr_map.get(privileges_required, 0.85)
        ui = ui_map.get(user_interaction, 0.85)
        
        c = impact_map.get(confidentiality, 0.0)
        i = impact_map.get(integrity, 0.0)
        a = impact_map.get(availability, 0.0)
        
        scope = scope_map.get(scope, 0.0)
        impact = 1 - ((1 - c) * (1 - i) * (1 - a))
        
        if impact <= 0:
            return 0.0
        
        if scope == 0.0:
            base_score = min(10.0, (av * ac * pr * ui * impact))
        else:
            base_score = min(10.0, ((av * ac * pr * ui * (impact + scope))))
        
        return round(base_score, 1)


class AttackClassifier:
    """Classify network traffic and payloads for attack patterns."""
    
    # Attack signatures and patterns
    ATTACK_SIGNATURES = {
        AttackType.SQL_INJECTION: [
            r"'\s*(OR|AND)\s*'?1'?\s*=\s*'?1'?",
            r"(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\s*\(",
            r"(union\s+select|select.*from|insert.*into|drop\s+table)",
            r";.*--(--|#|/\*)",
        ],
        AttackType.CROSS_SITE_SCRIPTING: [
            r"<script[^>]*>",
            r"javascript:",
            r"on(load|error|click|mouseover|focus)\s*=",
            r"<iframe[^>]*>",
            r"<img[^>]*onerror=",
            r"<svg[^>]*on",
        ],
        AttackType.PATH_TRAVERSAL: [
            r"(\.\./|\.\.\\|\.\%2f|\.\%5c|%2e%2e)",
            r"(/etc/passwd|/etc/shadow|c:\\windows\\system32)",
            r"(\.{2,}[/\\])+",
        ],
        AttackType.COMMAND_INJECTION: [
            r"([|&;`$\(\)\{\}])+.*(/bin/sh|cmd\.exe|powershell)",
            r"(\$\(|`)[^)]*(/bin|cmd|powershell)",
        ],
        AttackType.MALWARE_INDICATOR: [
            r"\.(exe|dll|scr|vbs|bat|cmd|ps1|msi|cab)\b",
            r"(mimikatz|psexec|metasploit|havoc|cobalt)",
        ],
    }
    
    # Common C2 domains (stub - in real scenario, use threat intel feeds)
    C2_DOMAINS = {
        "malware-c2.com", "botnet-command.net", "exploit-kit.ru"
    }
    
    # Port-based suspicious patterns
    SUSPICIOUS_PORTS = {
        4444, 5555, 6666, 7777, 8888,  # Metasploit defaults
        31337,  # Back Orifice
        666, 999,  # Common backdoors
    }

    @staticmethod
    def classify_flow(flow: Dict) -> Tuple[AttackType, float, List[str]]:
        """Classify a flow and return (attack_type, confidence, reasons)."""
        reasons = []
        confidence = 0.0
        attack_type = AttackType.NORMAL
        
        # Check for brute force patterns
        if flow.get("app_type") in ["SSH", "HTTP"]:
            # In real scenario, correlate multiple flows
            if flow.get("packets") > 100 and flow.get("duration", 1) < 5:
                reasons.append("High packet rate in short duration (brute force indicator)")
                confidence = max(confidence, 0.65)
                attack_type = AttackType.BROKEN_AUTH
        
        # Check for suspicious ports
        if flow.get("dst_port") in AttackClassifier.SUSPICIOUS_PORTS:
            reasons.append(f"Traffic to suspicious port {flow.get('dst_port')}")
            confidence = max(confidence, 0.55)
            attack_type = AttackType.MALWARE_INDICATOR
        
        # Check for unencrypted sensitive data
        if flow.get("app_type") == "HTTP" and flow.get("bytes_received", 0) > 10000:
            reasons.append("Large unencrypted HTTP transfer (potential data exposure)")
            confidence = max(confidence, 0.60)
            attack_type = AttackType.SENSITIVE_DATA_EXPOSURE
        
        # Check for C2-like behavior
        if flow.get("sni") in AttackClassifier.C2_DOMAINS:
            reasons.append(f"Connection to known C2 domain: {flow.get('sni')}")
            confidence = max(confidence, 0.95)
            attack_type = AttackType.MALWARE_INDICATOR
        
        # Large exfiltration patterns
        if flow.get("bytes_sent", 0) > 50_000_000:  # >50MB
            reasons.append(f"Large data exfiltration ({flow.get('bytes_sent')} bytes)")
            confidence = max(confidence, 0.75)
            attack_type = AttackType.DATA_EXFILTRATION
        
        return attack_type, min(1.0, confidence), reasons

    @staticmethod
    def classify_payload(payload: str) -> Tuple[AttackType, float, List[str]]:
        """Classify payload content for injection/XSS attacks."""
        reasons = []
        highest_confidence = 0.0
        detected_type = AttackType.NORMAL
        
        for attack_type, patterns in AttackClassifier.ATTACK_SIGNATURES.items():
            for pattern in patterns:
                if re.search(pattern, payload, re.IGNORECASE | re.DOTALL):
                    reasons.append(f"Matched pattern for {attack_type.value}")
                    confidence = 0.85
                    if confidence > highest_confidence:
                        highest_confidence = confidence
                        detected_type = attack_type
        
        return detected_type, highest_confidence, reasons

    @staticmethod
    def get_cvss_for_attack(attack_type: AttackType) -> Dict:
        """Return CVSS parameters for an attack type."""
        cvss_map = {
            AttackType.SQL_INJECTION: {
                "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "NONE",
                "scope": "CHANGED", "c": "HIGH", "i": "HIGH", "a": "HIGH", "base": 9.8
            },
            AttackType.CROSS_SITE_SCRIPTING: {
                "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "REQUIRED",
                "scope": "CHANGED", "c": "LOW", "i": "LOW", "a": "NONE", "base": 6.1
            },
            AttackType.BROKEN_AUTH: {
                "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "NONE",
                "scope": "UNCHANGED", "c": "HIGH", "i": "HIGH", "a": "HIGH", "base": 9.8
            },
            AttackType.SENSITIVE_DATA_EXPOSURE: {
                "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "NONE",
                "scope": "UNCHANGED", "c": "HIGH", "i": "NONE", "a": "NONE", "base": 7.5
            },
            AttackType.DATA_EXFILTRATION: {
                "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "NONE",
                "scope": "UNCHANGED", "c": "HIGH", "i": "NONE", "a": "NONE", "base": 7.5
            },
            AttackType.PATH_TRAVERSAL: {
                "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "NONE",
                "scope": "UNCHANGED", "c": "HIGH", "i": "LOW", "a": "NONE", "base": 7.5
            },
            AttackType.MALWARE_INDICATOR: {
                "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "REQUIRED",
                "scope": "CHANGED", "c": "HIGH", "i": "HIGH", "a": "HIGH", "base": 8.7
            },
            AttackType.DDoS_ATTACK: {
                "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "NONE",
                "scope": "UNCHANGED", "c": "NONE", "i": "NONE", "a": "HIGH", "base": 7.5
            },
        }
        
        return cvss_map.get(attack_type, {
            "av": "NETWORK", "ac": "LOW", "pr": "NONE", "ui": "NONE",
            "scope": "UNCHANGED", "c": "NONE", "i": "NONE", "a": "NONE", "base": 0.0
        })
