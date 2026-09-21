package com.mobiguard.app.service

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.*

data class InterceptedMessage(
    val id: String,
    val appPackage: String,
    val appName: String,
    val sender: String,
    val text: String,
    val timestamp: Long,
    val formattedTime: String,
    val isSuspectedScam: Boolean,
    val scamCategory: String
)

class MobiGuardNotificationListener : NotificationListenerService() {

    companion object {
        private val _messages = MutableStateFlow<List<InterceptedMessage>>(emptyList())
        val messages: StateFlow<List<InterceptedMessage>> = _messages.asStateFlow()

        private val SCAM_SIGNALS = listOf(
            "kyc", "otp", "pin", "lottery", "prize", "winner", "blocked",
            "suspended", "electricity", "bank account", "refund", "won",
            "deposit", "earn", "part time job", "bit.ly", "tinyurl", "apk"
        )

        fun isNotificationServiceEnabled(context: Context): Boolean {
            val pkgName = context.packageName
            val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
            return flat != null && flat.contains(pkgName)
        }

        fun openNotificationSettings(context: Context) {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }

        fun addIntercepted(msg: InterceptedMessage) {
            val current = _messages.value.toMutableList()
            // Avoid duplicate notifications within 3 seconds
            val isDuplicate = current.any {
                it.sender == msg.sender && it.text == msg.text && (msg.timestamp - it.timestamp < 3000)
            }
            if (!isDuplicate) {
                current.add(0, msg)
                if (current.size > 50) current.removeAt(current.size - 1)
                _messages.value = current
            }
        }

        fun clearIntercepted() {
            _messages.value = emptyList()
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val pkg = sbn.packageName ?: return

        // Support WhatsApp, WhatsApp Business, Telegram, and standard SMS messaging apps
        val isWhatsApp = pkg == "com.whatsapp" || pkg == "com.whatsapp.w4b"
        val isTelegram = pkg.contains("telegram")
        val isSms = pkg.contains("mms") || pkg.contains("messaging") || pkg.contains("messages")

        if (!isWhatsApp && !isTelegram && !isSms) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: ""

        if (text.isBlank()) return

        val appName = when {
            pkg == "com.whatsapp" -> "WhatsApp"
            pkg == "com.whatsapp.w4b" -> "WhatsApp Business"
            isTelegram -> "Telegram"
            else -> "SMS Messages"
        }

        val lower = text.lowercase(Locale.ROOT)
        val isSuspect = SCAM_SIGNALS.any { lower.contains(it) }
        val category = when {
            lower.contains("kyc") || lower.contains("pan") -> "Fake KYC Alert"
            lower.contains("otp") || lower.contains("pin") -> "OTP Request / PIN Trap"
            lower.contains("lottery") || lower.contains("prize") || lower.contains("won") -> "Prize / Lottery Scam"
            lower.contains("electricity") || lower.contains("disconnected") -> "Utility Disconnection Threat"
            lower.contains("apk") || lower.contains("download") -> "Direct APK Malware Link"
            lower.contains("job") || lower.contains("earn") || lower.contains("deposit") -> "Job / Task Fraud"
            else -> if (isSuspect) "Suspicious Link / Offer" else "Normal Chat"
        }

        val sdf = SimpleDateFormat("hh:mm a", Locale.getDefault())
        val msg = InterceptedMessage(
            id = UUID.randomUUID().toString(),
            appPackage = pkg,
            appName = appName,
            sender = title.ifBlank { "Unknown Contact" },
            text = text,
            timestamp = System.currentTimeMillis(),
            formattedTime = sdf.format(Date()),
            isSuspectedScam = isSuspect,
            scamCategory = category
        )

        addIntercepted(msg)
    }
}
