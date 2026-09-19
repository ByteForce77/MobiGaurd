package com.mobiguard.app.ml

enum class VerdictLevel(val title: String) {
    GENUINE("GENUINE"),
    SUSPICIOUS("SUSPICIOUS"),
    FRAUD_RISK("FRAUD RISK")
}

data class Verdict(
    val level: VerdictLevel,
    val score: Int,
    val confidence: Int,
    val label: String,
    val recommendation: String,
    val signals: RiskSignals,
    val upiDetails: UpiDetails?
)

object VerdictEngine {
    /**
     * Verdicts:
     * 0–30 GENUINE
     * 31–60 SUSPICIOUS
     * 61–100 FRAUD RISK
     *
     * Privacy & Responsible AI Mandate:
     * Never output "100% safe" or "100% fraud".
     */
    fun determine(score: Int, signals: RiskSignals, upi: UpiDetails?): Verdict {
        return when {
            score <= 30 -> Verdict(
                level = VerdictLevel.GENUINE,
                score = score,
                confidence = (100 - score).coerceIn(88, 98),
                label = "No fraud signals detected",
                recommendation = "Message matches expected authentic transactional formatting. Always verify unprompted communications independently.",
                signals = signals,
                upiDetails = if (upi?.isUpi == true) upi else null
            )
            score <= 60 -> Verdict(
                level = VerdictLevel.SUSPICIOUS,
                score = score,
                confidence = (50 + (score - 30)).coerceIn(60, 85),
                label = "Verify before acting",
                recommendation = "Unusual characteristics detected. Contact the institution independently using their official app or website.",
                signals = signals,
                upiDetails = if (upi?.isUpi == true) upi else null
            )
            else -> Verdict(
                level = VerdictLevel.FRAUD_RISK,
                score = score,
                confidence = score.coerceIn(85, 98),
                label = "Multiple strong fraud indicators detected.",
                recommendation = "DO NOT click links, do not dial provided numbers, and NEVER enter your UPI PIN. Report to cybercrime.gov.in.",
                signals = signals,
                upiDetails = if (upi?.isUpi == true) upi else null
            )
        }
    }
}
