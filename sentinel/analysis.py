"""Analysis layer: lightweight, explainable heuristics and simple signal extraction."""
from typing import Dict

def extract_features(flow: Dict) -> Dict:
    f = {
        "bytes": flow.get("bytes", 0),
        "packets": flow.get("packets", 0),
        "tls": bool(flow.get("tls", False)),
        "has_sni": bool(flow.get("server_name")),
        "domain": flow.get("domain", ""),
        "ja3": flow.get("ja3", ""),
    }
    return f

def classify_flow(flow: Dict) -> Dict:
    """Return a small, explainable classification and confidence.

    This is intentionally simple and local to avoid heavy dependencies.
    Replace or augment with models later.
    """
    features = extract_features(flow)
    reasons = []
    score = 0.5

    if not features["tls"]:
        reasons.append("unencrypted_http")
        score += 0.15

    if "auth" in features["domain"] or "login" in features["domain"]:
        reasons.append("auth_flow")
        score += 0.2

    if features["bytes"] > 1_000_000:
        reasons.append("large_transfer")
        score += 0.2

    if features["packets"] > 3000:
        reasons.append("many_packets")
        score += 0.1

    # normalize confidence to [0,1]
    confidence = min(1.0, max(0.0, score))

    label = ";".join(reasons) if reasons else "normal"

    result = {
        "flow_id": flow.get("id"),
        "label": label,
        "confidence": round(confidence, 2),
        "reasons": reasons,
        "features": features,
        "meta": {"src": flow.get("src_ip"), "dst": flow.get("dst_ip"), "domain": features["domain"]},
    }
    return result
