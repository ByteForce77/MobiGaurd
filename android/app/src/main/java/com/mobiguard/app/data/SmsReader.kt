package com.mobiguard.app.data

import android.content.Context
import android.database.Cursor
import android.net.Uri
import java.text.SimpleDateFormat
import java.util.*

data class SmsInboxItem(
    val id: String,
    val sender: String,
    val body: String,
    val timestamp: Long,
    val formattedDate: String,
    val isRead: Boolean = true,
    val isProbableScam: Boolean = false,
    val scamCategory: String = ""
)

object SmsReader {

    private val SCAM_KEYWORDS = listOf(
        "kyc", "pan card", "blocked", "suspended", "lottery", "won",
        "prize", "apk", "urgent", "electricity", "disconnected", "bit.ly",
        "tinyurl", "refund", "upi pin", "debit", "congratulations"
    )

    fun hasSmsPermission(context: Context): Boolean {
        return androidx.core.content.ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.READ_SMS
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    fun readInbox(context: Context, limit: Int = 40): List<SmsInboxItem> {
        val messages = mutableListOf<SmsInboxItem>()
        if (!hasSmsPermission(context)) return messages

        val uri = Uri.parse("content://sms/inbox")
        val projection = arrayOf("_id", "address", "body", "date", "read")

        try {
            val cursor: Cursor? = context.contentResolver.query(
                uri,
                projection,
                null,
                null,
                "date DESC"
            )

            cursor?.use {
                val idIdx = it.getColumnIndexOrThrow("_id")
                val addressIdx = it.getColumnIndexOrThrow("address")
                val bodyIdx = it.getColumnIndexOrThrow("body")
                val dateIdx = it.getColumnIndexOrThrow("date")
                val readIdx = it.getColumnIndexOrThrow("read")

                val sdf = SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault())
                var count = 0

                while (it.moveToNext() && count < limit) {
                    val id = it.getString(idIdx) ?: UUID.randomUUID().toString()
                    val sender = it.getString(addressIdx) ?: "Unknown Sender"
                    val body = it.getString(bodyIdx) ?: ""
                    val date = it.getLong(dateIdx)
                    val isRead = it.getInt(readIdx) == 1

                    val lowerBody = body.lowercase(Locale.ROOT)
                    val hasKeywords = SCAM_KEYWORDS.any { kw -> lowerBody.contains(kw) }
                    val category = when {
                        lowerBody.contains("kyc") || lowerBody.contains("pan") -> "Fake KYC Alert"
                        lowerBody.contains("electricity") || lowerBody.contains("disconnected") -> "Utility Threat"
                        lowerBody.contains("lottery") || lowerBody.contains("won") || lowerBody.contains("prize") -> "Lottery/Prize Scam"
                        lowerBody.contains("otp") && (lowerBody.contains("share") || lowerBody.contains("tell")) -> "OTP Solicitation"
                        lowerBody.contains("apk") || lowerBody.contains("bit.ly") || lowerBody.contains("http") -> "Suspicious Link"
                        else -> if (hasKeywords) "Suspicious Content" else "Normal SMS"
                    }

                    messages.add(
                        SmsInboxItem(
                            id = id,
                            sender = sender,
                            body = body,
                            timestamp = date,
                            formattedDate = sdf.format(Date(date)),
                            isRead = isRead,
                            isProbableScam = hasKeywords,
                            scamCategory = category
                        )
                    )
                    count++
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return messages
    }
}
