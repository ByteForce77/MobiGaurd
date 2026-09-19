package com.mobiguard.app.ml

object RiskScoreEngine {
    /**
     * Exact 5-Signal Weighted Formula:
     * Score = (Urgency × 0.25) + (Payment Contradiction × 0.30) + (Recipient Mismatch × 0.25) + (Template Match × 0.15) + (URL Risk × 0.05)
     */
    fun computeScore(signals: RiskSignals, isOtpOrAlert: Boolean): Int {
        var rawScore = (signals.urgency * 0.25) +
                (signals.contradiction * 0.30) +
                (signals.mismatch * 0.25) +
                (signals.template * 0.15) +
                (signals.urlRisk * 0.05)

        if (isOtpOrAlert && signals.contradiction == 0 && signals.template == 0 && signals.urlRisk == 0) {
            rawScore = rawScore.coerceAtMost(10.0)
        }

        return rawScore.toInt().coerceIn(0, 100)
    }
}
