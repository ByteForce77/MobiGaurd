package com.mobiguard.app.ml

import java.net.URI
import java.net.URLDecoder
import java.util.regex.Pattern

data class RiskSignals(
    val urgency: Int,           // 0-100
    val contradiction: Int,     // 0-100
    val mismatch: Int,          // 0-100
    val template: Int,          // 0-100
    val urlRisk: Int,           // 0-100
    val explanations: List<String>
)

data class UpiDetails(
    val pa: String? = null,
    val pn: String? = null,
    val am: String? = null,
    val tn: String? = null,
    val cu: String = "INR",
    val isUpi: Boolean = false
)

object RuleEngine {
    private val KNOWN_BRANDS = listOf(
        "amazon", "flipkart", "hdfc", "sbi", "icici", "axis", "kotak", "pnb",
        "paytm", "phonepe", "google pay", "gpay", "airtel", "jio", "vi", "bhim"
    )

    private val SUSPICIOUS_TLDS = listOf(".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq", ".work", ".click", ".cc", ".buzz")
    private val SHORTENERS = listOf("bit.ly", "tinyurl.com", "t.co", "rb.gy", "shorturl.at", "is.gd", "cutt.ly", "ow.ly")

    private val SCAM_PATTERNS = listOf(
        // KYC
        Pair(Pattern.compile("kyc.*(?:expir|block|suspend|updat|deactivat)", Pattern.CASE_INSENSITIVE), "KYC expiration or account block threat"),
        Pair(Pattern.compile("(?:pan|aadhaar).*link.*(?:immediat|urgent|today|deactiv)", Pattern.CASE_INSENSITIVE), "Urgent PAN/Aadhaar linking threat"),
        Pair(Pattern.compile("account.*will be (?:blocked|frozen|suspended|deactivated)", Pattern.CASE_INSENSITIVE), "Bank account freeze threat"),
        Pair(Pattern.compile("sim.*(?:block|deactivat|kyc).*(?:24|12|today)", Pattern.CASE_INSENSITIVE), "SIM card deactivation KYC threat"),
        Pair(Pattern.compile("pay.*(?:fee|charge|₹|\\b\\d+\\b).*to update kyc", Pattern.CASE_INSENSITIVE), "Monetary fee demanded for KYC update"),
        Pair(Pattern.compile("update.*yono.*(?:kyc|block|pan)", Pattern.CASE_INSENSITIVE), "Fake SBI YONO KYC update threat"),

        // Refund & Contradictions
        Pair(Pattern.compile("(?:pay|send|enter upi).*to (?:receive|claim|collect).*refund", Pattern.CASE_INSENSITIVE), "Payment requested to receive a refund (Contradiction)"),
        Pair(Pattern.compile("refund of (?:rs\\.?|₹)\\s*\\d+.*(?:approved|pending).*click", Pattern.CASE_INSENSITIVE), "Pending refund approval link bait"),
        Pair(Pattern.compile("cashback.*₹?\\s*\\d+.*(?:scratch|expire|claim)", Pattern.CASE_INSENSITIVE), "Cashback reward expiration phishing"),

        // Lottery & Advance Fee Scams
        Pair(Pattern.compile("(?:won|congratulations).*₹?\\s*\\d+.*(?:lottery|kbc|lucky draw|prize|cash|reward)", Pattern.CASE_INSENSITIVE), "Fake lottery, prize, or jackpot award lure"),
        Pair(Pattern.compile("pay.*(?:processing|registration|stamp|tax).*fee.*to receive (?:prize|money|car|reward)", Pattern.CASE_INSENSITIVE), "Advance fee demanded for prize claim"),
        Pair(Pattern.compile("(?:processing fee|registration fee|clearance fee).*immediately", Pattern.CASE_INSENSITIVE), "Urgent upfront processing fee demanded"),

        // Utilities / Electricity
        Pair(Pattern.compile("electricity.*power.*(?:disconnect|cut).*tonight", Pattern.CASE_INSENSITIVE), "Urgent electricity power cut disconnection threat"),
        Pair(Pattern.compile("officer.*contact.*(?:mobile|cell|\\+91).*electricity", Pattern.CASE_INSENSITIVE), "Personal mobile number given for electricity officer"),

        // Jobs
        Pair(Pattern.compile("(?:part[- ]?time|work from home).*earn ₹?\\s*\\d+.*(?:daily|per day)", Pattern.CASE_INSENSITIVE), "Work-from-home high earnings task scam"),
        Pair(Pattern.compile("job offer.*pay.*(?:security deposit|registration fee|kit)", Pattern.CASE_INSENSITIVE), "Upfront fee requested for job offer"),

        // Loans & Extortion
        Pair(Pattern.compile("loan.*pre[- ]?approved.*₹?\\s*\\d+.*no cibil.*instant", Pattern.CASE_INSENSITIVE), "Predatory no-CIBIL instant loan offer"),
        Pair(Pattern.compile("(?:fedex|dhl|india post).*parcel.*(?:held|customs|illegal)", Pattern.CASE_INSENSITIVE), "Customs parcel interception extortion")
    )

    fun parseUpiUri(raw: String): UpiDetails {
        if (!raw.startsWith("upi://pay", ignoreCase = true)) {
            return UpiDetails(isUpi = false)
        }
        return try {
            val uri = URI(raw)
            val query = uri.rawQuery ?: ""
            val params = query.split("&").associate {
                val parts = it.split("=")
                if (parts.size == 2) parts[0] to URLDecoder.decode(parts[1], "UTF-8") else parts[0] to ""
            }
            UpiDetails(
                pa = params["pa"],
                pn = params["pn"],
                am = params["am"],
                tn = params["tn"],
                cu = params["cu"] ?: "INR",
                isUpi = true
            )
        } catch (e: Exception) {
            UpiDetails(isUpi = true)
        }
    }

    fun evaluate(text: String): Pair<RiskSignals, UpiDetails> {
        val lower = text.lowercase()
        val explanations = mutableListOf<String>()
        val upi = parseUpiUri(text)

        // 1. URGENCY SIGNAL (0-100)
        val urgencyKeywords = listOf(
            "immediately", "urgent", "act now", "expires today", "expiring today", "blocked",
            "suspended", "last chance", "within 24 hours", "within 2 hours", "tonight", "final warning"
        )
        val urgencyMatches = urgencyKeywords.count { lower.contains(it) }
        val urgencyScore = (urgencyMatches * 32).coerceAtMost(100)
        if (urgencyMatches > 0) {
            explanations.add("High Urgency Pressure: $urgencyMatches panic-inducing keyword(s) detected.")
        }

        // 2. PAYMENT CONTRADICTION SIGNAL (0-100)
        var contradictionScore = 0
        if (upi.isUpi) {
            val note = (upi.tn ?: "").lowercase()
            val amount = upi.am?.toDoubleOrNull() ?: 0.0
            if ((note.contains("refund") || note.contains("cashback") || lower.contains("refund")) && amount > 0) {
                contradictionScore = 100
                explanations.add("Payment Contradiction (CRITICAL): UPI note says refund, but initiates a ₹${upi.am} DEBIT transaction. Entering PIN pays money!")
            }
        }
        if (contradictionScore == 0) {
            if (lower.contains("refund") && (lower.contains("pay") || lower.contains("send") || lower.contains("enter pin"))) {
                contradictionScore = 100
                explanations.add("Payment Contradiction: Genuine refunds never require sending money or entering your UPI PIN.")
            } else if (lower.contains("kyc") && (lower.contains("fee") || lower.contains("charge") || lower.contains("₹") || lower.contains("pay"))) {
                contradictionScore = 95
                explanations.add("Payment Contradiction: Mandatory bank KYC updates are 100% free by RBI regulations.")
            } else if ((lower.contains("won") || lower.contains("prize") || lower.contains("lottery")) &&
                (lower.contains("fee") || lower.contains("processing") || lower.contains("pay") || lower.contains("deposit"))) {
                contradictionScore = 95
                explanations.add("Contradiction: Legitimate lotteries never ask winners to pay upfront processing fees.")
            } else if ((lower.contains("job") || lower.contains("work from home")) && (lower.contains("registration fee") || lower.contains("deposit"))) {
                contradictionScore = 90
                explanations.add("Contradiction: Legitimate employers never charge candidates registration or starter kit fees.")
            }
        }

        // 3. RECIPIENT MISMATCH SIGNAL (0-100)
        var mismatchScore = 0
        val claimedBrand = KNOWN_BRANDS.firstOrNull { lower.contains(it) }

        if (upi.isUpi && upi.pa != null) {
            val vpa = upi.pa.lowercase()
            val payeeName = (upi.pn ?: "").lowercase()
            if (claimedBrand != null) {
                val clean = claimedBrand.replace(" ", "")
                if (!vpa.contains(clean) && !payeeName.contains(clean)) {
                    mismatchScore = 90
                    explanations.add("Brand Mismatch: Text mentions \"$claimedBrand\", but payment goes to \"${upi.pa}\".")
                }
            } else if (payeeName.contains("amazon") || payeeName.contains("flipkart") || payeeName.contains("hdfc")) {
                if (!vpa.contains("amazon") && !vpa.contains("flipkart") && !vpa.contains("hdfc")) {
                    mismatchScore = 95
                    explanations.add("Impersonation Mismatch: Payee name shows \"${upi.pn}\", but VPA is an unverified personal handle.")
                }
            }
        } else if (claimedBrand != null) {
            val upiRegex = Regex("""pa=([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)""")
            val urlRegex = Regex("""https?://([^\s/]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})""")
            val upiMatch = upiRegex.find(text)
            val urlMatch = urlRegex.find(text)

            if (upiMatch != null) {
                val handle = upiMatch.groupValues[1].lowercase()
                if (!handle.contains(claimedBrand.replace(" ", ""))) {
                    mismatchScore = 90
                    explanations.add("Brand Mismatch: Text mentions \"$claimedBrand\", but UPI address is \"${upiMatch.groupValues[1]}\".")
                }
            } else if (urlMatch != null) {
                val domain = urlMatch.groupValues[1].ifEmpty { urlMatch.groupValues[0] }.lowercase()
                if (!domain.contains(claimedBrand.replace(" ", "")) && !domain.contains("google.com")) {
                    mismatchScore = 80
                    explanations.add("Domain Mismatch: Text mentions \"$claimedBrand\", but link leads to \"$domain\".")
                }
            }
        } else if ((lower.contains("won") || lower.contains("prize")) && (lower.contains("fee") || lower.contains("pay"))) {
            mismatchScore = 75
            explanations.add("Sender Identity Mismatch: Advance fee prize solicitations from unknown senders indicate synthetic identity scam.")
        } else if (lower.contains("kyc") && (lower.contains("expir") || lower.contains("block") || lower.contains("pay"))) {
            mismatchScore = 70
            explanations.add("Sender Identity Mismatch: Urgent bank KYC threat sent from an unauthenticated, anonymous source.")
        } else if (lower.contains("electricity") && (lower.contains("cut") || lower.contains("disconnect"))) {
            mismatchScore = 65
            explanations.add("Sender Identity Mismatch: Power disconnection alert lacks official DISCOM authentication.")
        }

        // 4. TEMPLATE MATCH SIGNAL (0-100)
        var templateScore = 0
        val matchedTemplates = mutableListOf<String>()
        for ((pattern, desc) in SCAM_PATTERNS) {
            if (pattern.matcher(text).find()) {
                matchedTemplates.add(desc)
            }
        }
        if (matchedTemplates.isNotEmpty()) {
            templateScore = (50 + matchedTemplates.size * 25).coerceAtMost(100)
            explanations.add("Scam Template Match: Matched known Indian fraud vector (${matchedTemplates[0]}).")
        }

        // 5. URL RISK SIGNAL (0-100)
        var urlRiskScore = 0
        for (s in SHORTENERS) {
            if (lower.contains(s)) {
                urlRiskScore = urlRiskScore.coerceAtLeast(85)
                explanations.add("Shortened Link ($s): Masks destination domain to evade inspection.")
            }
        }
        for (tld in SUSPICIOUS_TLDS) {
            if (lower.contains(tld)) {
                urlRiskScore = urlRiskScore.coerceAtLeast(90)
                explanations.add("Suspicious TLD: \"$tld\" is commonly used in disposable phishing operations.")
            }
        }
        if (Regex("""\b(?:amaz0n|hdfcbank-kyc|sbiyono-update|paytm-verify|icici-rewards|airtel-kyc|flipk4rt|jio-recharge)\b""", RegexOption.IGNORE_CASE).containsMatchIn(lower)) {
            urlRiskScore = 100
            explanations.add("Brand Impersonation / Typo-squatting URL pattern detected.")
        }
        if (Regex("""\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b""").containsMatchIn(text)) {
            urlRiskScore = 95
            explanations.add("Raw IP address URL detected instead of verified HTTPS domain.")
        }

        // Check for authentic transactional notifications (OTP or balance alert)
        val isOtp = lower.contains("otp") && Regex("""\b\d{4,8}\b""").containsMatchIn(text) &&
                !lower.contains("click") && !lower.contains("pay") && !lower.contains("bit.ly")
        val isBankAlert = (lower.contains("debited") || lower.contains("credited")) && lower.contains("a/c") &&
                !lower.contains("click") && !lower.contains("call")
        if (isOtp || isBankAlert) {
            explanations.add("Authentic transactional notification format identified (no phishing links or payment demands).")
        }

        return Pair(
            RiskSignals(
                urgency = urgencyScore,
                contradiction = contradictionScore,
                mismatch = mismatchScore,
                template = templateScore,
                urlRisk = urlRiskScore,
                explanations = explanations
            ),
            upi
        )
    }
}
