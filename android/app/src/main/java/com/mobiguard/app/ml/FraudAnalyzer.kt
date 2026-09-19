package com.mobiguard.app.ml

import android.content.Context

data class FraudAnalysisOutput(
    val verdict: Verdict,
    val inferenceTimeMs: Long,
    val modelType: String
)

class FraudAnalyzer(context: Context) {
    private val modelAnalyzer = LocalModelAnalyzer(context)

    fun analyze(text: String): FraudAnalysisOutput {
        val start = System.currentTimeMillis()
        val modelResult = modelAnalyzer.analyze(text)
        val (signals, upiDetails) = RuleEngine.evaluate(text)

        val lower = text.lowercase()
        val isOtpOrAlert = (lower.contains("otp") || lower.contains("debited") || lower.contains("credited")) &&
                !lower.contains("click") && !lower.contains("bit.ly") && !lower.contains("pay")

        val score = RiskScoreEngine.computeScore(signals, isOtpOrAlert)
        val verdict = VerdictEngine.determine(score, signals, upiDetails)
        val totalTime = System.currentTimeMillis() - start + modelResult.inferenceTimeMs

        return FraudAnalysisOutput(
            verdict = verdict,
            inferenceTimeMs = totalTime,
            modelType = modelResult.modelUsed
        )
    }

    fun release() {
        modelAnalyzer.close()
    }
}
