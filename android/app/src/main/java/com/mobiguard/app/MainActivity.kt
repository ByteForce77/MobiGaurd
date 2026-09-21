package com.mobiguard.app

import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import com.mobiguard.app.data.AppDatabase
import com.mobiguard.app.data.ScanRecord
import com.mobiguard.app.data.SmsInboxItem
import com.mobiguard.app.data.SmsReader
import com.mobiguard.app.ml.*
import com.mobiguard.app.service.InterceptedMessage
import com.mobiguard.app.service.MobiGuardNotificationListener
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {

    private lateinit var fraudAnalyzer: FraudAnalyzer
    private lateinit var database: AppDatabase

    private var incomingSharedTextState = mutableStateOf("")
    private var smsPermissionGrantedState = mutableStateOf(false)
    private var notificationAccessGrantedState = mutableStateOf(false)

    private val requestSmsPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        smsPermissionGrantedState.value = isGranted
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        fraudAnalyzer = FraudAnalyzer(this)
        database = AppDatabase.getDatabase(this)

        smsPermissionGrantedState.value = SmsReader.hasSmsPermission(this)
        notificationAccessGrantedState.value = MobiGuardNotificationListener.isNotificationServiceEnabled(this)

        // Read incoming shared text from WhatsApp, SMS, or system text selection
        val initialText = extractSharedText(intent)
        incomingSharedTextState.value = initialText

        setContent {
            MobiGuardTheme {
                MobiGuardApp(
                    initialSharedText = incomingSharedTextState.value,
                    onAnalyzeText = { text, type -> analyzeAndSave(text, type) },
                    onDeleteAllHistory = { clearHistory() },
                    getHistoryFlow = { database.scanDao().getAllScans() },
                    onHaptic = { isSevere -> triggerHaptic(isSevere) },
                    onCopyClipboard = { copyToClipboard(it) },
                    onPasteClipboard = { pasteFromClipboard() },
                    smsPermissionGranted = smsPermissionGrantedState.value,
                    onRequestSmsPermission = {
                        requestSmsPermissionLauncher.launch(android.Manifest.permission.READ_SMS)
                    },
                    notificationAccessGranted = notificationAccessGrantedState.value,
                    onOpenNotificationSettings = {
                        MobiGuardNotificationListener.openNotificationSettings(this)
                    },
                    onReadSmsInbox = { SmsReader.readInbox(this) },
                    getNotificationFlow = { MobiGuardNotificationListener.messages }
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        smsPermissionGrantedState.value = SmsReader.hasSmsPermission(this)
        notificationAccessGrantedState.value = MobiGuardNotificationListener.isNotificationServiceEnabled(this)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        val text = extractSharedText(intent)
        if (text.isNotBlank()) {
            incomingSharedTextState.value = text
        }
    }

    private fun extractSharedText(intent: Intent?): String {
        if (intent == null) return ""
        return when (intent.action) {
            Intent.ACTION_SEND -> {
                if (intent.type == "text/plain") {
                    intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
                } else ""
            }
            Intent.ACTION_PROCESS_TEXT -> {
                intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString() ?: ""
            }
            Intent.ACTION_VIEW -> {
                intent.data?.getQueryParameter("text") 
                    ?: intent.data?.getQueryParameter("url") 
                    ?: ""
            }
            else -> intent.getStringExtra("EXTRA_SCAN_TEXT") ?: ""
        }
    }

    private fun analyzeAndSave(text: String, type: String): FraudAnalysisOutput {
        val output = fraudAnalyzer.analyze(text)
        val v = output.verdict
        lifecycleScope.launch(Dispatchers.IO) {
            val record = ScanRecord(
                id = UUID.randomUUID().toString(),
                timestamp = System.currentTimeMillis(),
                type = type,
                preview = if (text.length > 70) text.take(67) + "..." else text,
                verdict = v.level.title,
                score = v.score,
                confidence = v.confidence,
                rawText = text,
                recommendation = v.recommendation,
                urgencyScore = v.signals.urgency,
                contradictionScore = v.signals.contradiction,
                mismatchScore = v.signals.mismatch,
                templateScore = v.signals.template,
                urlRiskScore = v.signals.urlRisk,
                explanationText = v.signals.explanations.joinToString("; ")
            )
            database.scanDao().insertScan(record)
        }
        return output
    }

    private fun clearHistory() {
        lifecycleScope.launch(Dispatchers.IO) {
            database.scanDao().deleteAllScans()
        }
    }

    private fun triggerHaptic(isSevere: Boolean) {
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = if (isSevere) {
                VibrationEffect.createWaveform(longArrayOf(0, 120, 80, 200), -1)
            } else {
                VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
            }
            vibrator.vibrate(effect)
        } else {
            vibrator.vibrate(if (isSevere) 300 else 50)
        }
    }

    private fun copyToClipboard(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = android.content.ClipData.newPlainText("MobiGuard", text)
        clipboard.setPrimaryClip(clip)
    }

    private fun pasteFromClipboard(): String {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val item = clipboard.primaryClip?.getItemAt(0)
        return item?.text?.toString() ?: ""
    }

    override fun onDestroy() {
        super.onDestroy()
        fraudAnalyzer.release()
    }
}

// Material 3 Dark Colors
private val DarkBg = Color(0xFF0B1120)
private val CardBg = Color(0xFF1E293B)
private val CardBgDark = Color(0xFF111827)
private val AccentGreen = Color(0xFF10B981)
private val AccentCyan = Color(0xFF06B6D4)
private val AlertRose = Color(0xFFF43F5E)
private val AlertAmber = Color(0xFFF59E0B)
private val TextWhite = Color(0xFFF8FAFC)
private val TextMuted = Color(0xFF94A3B8)

@Composable
fun MobiGuardTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            background = DarkBg,
            surface = CardBg,
            primary = AccentGreen,
            secondary = AccentCyan,
            error = AlertRose,
            onBackground = TextWhite,
            onSurface = TextWhite
        ),
        content = content
    )
}

enum class Screen {
    HOME, CHECK_MESSAGE, DIRECT_INBOX, VERDICT, HISTORY, ABOUT
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MobiGuardApp(
    initialSharedText: String,
    onAnalyzeText: (String, String) -> FraudAnalysisOutput,
    onDeleteAllHistory: () -> Unit,
    getHistoryFlow: () -> kotlinx.coroutines.flow.Flow<List<ScanRecord>>,
    onHaptic: (Boolean) -> Unit,
    onCopyClipboard: (String) -> Unit,
    onPasteClipboard: () -> String,
    smsPermissionGranted: Boolean,
    onRequestSmsPermission: () -> Unit,
    notificationAccessGranted: Boolean,
    onOpenNotificationSettings: () -> Unit,
    onReadSmsInbox: () -> List<SmsInboxItem>,
    getNotificationFlow: () -> kotlinx.coroutines.flow.StateFlow<List<InterceptedMessage>>
) {
    var currentScreen by remember { mutableStateOf(if (initialSharedText.isNotEmpty()) Screen.CHECK_MESSAGE else Screen.HOME) }
    var messageInput by remember { mutableStateOf(initialSharedText) }
    var currentResult by remember { mutableStateOf<FraudAnalysisOutput?>(null) }
    var currentRawText by remember { mutableStateOf("") }
    var currentScanType by remember { mutableStateOf("SMS") }
    var showWhy by remember { mutableStateOf(true) }

    val historyList by getHistoryFlow().collectAsState(initial = emptyList())
    val interceptedList by getNotificationFlow().collectAsState()

    val testMessages = listOf(
        Pair("KYC Expiry Scam", "Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz"),
        Pair("Genuine OTP Alert", "Your OTP is 482910. Do not share with anyone. - HDFC Bank"),
        Pair("Prize Fee Scam", "Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to receive your prize."),
        Pair("Electricity Cut Threat", "Dear consumer your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Call officer 9876543210 immediately: bit.ly/power-bill")
    )
    var exampleIndex by remember { mutableStateOf(0) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = DarkBg,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = currentScreen == Screen.HOME || currentScreen == Screen.CHECK_MESSAGE || currentScreen == Screen.VERDICT,
                    onClick = { currentScreen = Screen.HOME },
                    icon = { Icon(Icons.Default.Shield, contentDescription = "Home") },
                    label = { Text("Home", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AccentGreen,
                        selectedTextColor = AccentGreen,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted,
                        indicatorColor = CardBg
                    )
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.DIRECT_INBOX,
                    onClick = { currentScreen = Screen.DIRECT_INBOX },
                    icon = { Icon(Icons.Default.Inbox, contentDescription = "Inboxes") },
                    label = { Text("Inboxes", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AccentGreen,
                        selectedTextColor = AccentGreen,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted,
                        indicatorColor = CardBg
                    )
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.HISTORY,
                    onClick = { currentScreen = Screen.HISTORY },
                    icon = { Icon(Icons.Default.History, contentDescription = "History") },
                    label = { Text("History", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AccentGreen,
                        selectedTextColor = AccentGreen,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted,
                        indicatorColor = CardBg
                    )
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.ABOUT,
                    onClick = { currentScreen = Screen.ABOUT },
                    icon = { Icon(Icons.Default.Info, contentDescription = "About") },
                    label = { Text("About", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AccentGreen,
                        selectedTextColor = AccentGreen,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted,
                        indicatorColor = CardBg
                    )
                )
            }
        },
        containerColor = DarkBg
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize().background(DarkBg)) {
            when (currentScreen) {
                Screen.HOME -> {
                    HomeScreen(
                        onNavigateCheck = { currentScreen = Screen.CHECK_MESSAGE },
                        onNavigateInbox = { currentScreen = Screen.DIRECT_INBOX },
                        onQuickTest = { text ->
                            currentRawText = text
                            currentScanType = "SMS"
                            val res = onAnalyzeText(text, "SMS")
                            currentResult = res
                            onHaptic(res.verdict.level == VerdictLevel.FRAUD_RISK)
                            currentScreen = Screen.VERDICT
                        }
                    )
                }

                Screen.DIRECT_INBOX -> {
                    DirectInboxScreen(
                        smsPermissionGranted = smsPermissionGranted,
                        onRequestSmsPermission = onRequestSmsPermission,
                        notificationAccessGranted = notificationAccessGranted,
                        onOpenNotificationSettings = onOpenNotificationSettings,
                        interceptedMessages = interceptedList,
                        onReadSmsInbox = onReadSmsInbox,
                        onScanMessage = { text, type ->
                            currentRawText = text
                            currentScanType = type
                            val res = onAnalyzeText(text, type)
                            currentResult = res
                            onHaptic(res.verdict.level == VerdictLevel.FRAUD_RISK)
                            currentScreen = Screen.VERDICT
                        }
                    )
                }

                Screen.CHECK_MESSAGE -> {
                    CheckMessageScreen(
                        messageInput = messageInput,
                        onMessageChange = { messageInput = it },
                        onPaste = {
                            val pasted = onPasteClipboard()
                            if (pasted.isNotEmpty()) messageInput = pasted
                        },
                        onClear = { messageInput = "" },
                        onLoadExample = {
                            val ex = testMessages[exampleIndex % testMessages.size]
                            messageInput = ex.second
                            exampleIndex++
                        },
                        onAnalyze = {
                            if (messageInput.isNotBlank()) {
                                currentRawText = messageInput
                                currentScanType = "SMS"
                                val res = onAnalyzeText(messageInput, "SMS")
                                currentResult = res
                                onHaptic(res.verdict.level == VerdictLevel.FRAUD_RISK)
                                currentScreen = Screen.VERDICT
                            }
                        }
                    )
                }

                Screen.VERDICT -> {
                    currentResult?.let { res ->
                        VerdictScreen(
                            result = res,
                            rawPayload = currentRawText,
                            scanType = currentScanType,
                            showWhy = showWhy,
                            onToggleWhy = { showWhy = !showWhy },
                            onScanAnother = {
                                messageInput = ""
                                currentScreen = Screen.CHECK_MESSAGE
                            },
                            onShare = {
                                onCopyClipboard("MobiGuard Verdict: ${res.verdict.level.title} (${res.verdict.score}/100)\n${res.verdict.recommendation}")
                            }
                        )
                    }
                }

                Screen.HISTORY -> {
                    HistoryScreen(
                        records = historyList,
                        onDeleteAll = onDeleteAllHistory,
                        onSelectRecord = { record ->
                            val (signals, upi) = RuleEngine.evaluate(record.rawText)
                            val v = Verdict(
                                level = when (record.verdict) {
                                    "GENUINE" -> VerdictLevel.GENUINE
                                    "SUSPICIOUS" -> VerdictLevel.SUSPICIOUS
                                    else -> VerdictLevel.FRAUD_RISK
                                },
                                score = record.score,
                                confidence = record.confidence,
                                label = if (record.score <= 30) "No fraud signals detected" else "Multiple strong fraud indicators detected.",
                                recommendation = record.recommendation,
                                signals = signals,
                                upiDetails = upi
                            )
                            currentResult = FraudAnalysisOutput(v, 10, "Local Room Storage")
                            currentRawText = record.rawText
                            currentScanType = record.type
                            currentScreen = Screen.VERDICT
                        }
                    )
                }

                Screen.ABOUT -> {
                    AboutScreen()
                }
            }
        }
    }
}

@Composable
fun HomeScreen(
    onNavigateCheck: () -> Unit,
    onNavigateInbox: () -> Unit,
    onQuickTest: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(modifier = Modifier.padding(top = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(40.dp).background(AccentGreen, RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Shield, contentDescription = null, tint = DarkBg)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "MobiGuard",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            color = TextWhite
                        )
                        Text(
                            text = "Local AI. Real Protection. Zero Data Shared.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                }
            }
        }

        item {
            // Privacy Guarantee Banner
            Card(
                colors = CardDefaults.cardColors(containerColor = CardBg),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, AccentGreen.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "🔒", fontSize = 20.sp)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Your data stays on this device.",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = AccentGreen
                        )
                        Text(
                            text = "No cloud API. Zero telemetry. Runs in Airplane Mode.",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }
                }
            }
        }

        item {
            Text(
                text = "SECURITY ACTIONS",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 1.sp
            )
        }

        item {
            Button(
                onClick = onNavigateCheck,
                modifier = Modifier.fillMaxWidth().height(64.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CardBg)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(36.dp).background(AccentGreen.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Message, contentDescription = null, tint = AccentGreen, modifier = Modifier.size(20.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Check Message", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                            Text("Analyze SMS, WhatsApp, or UPI alerts", fontSize = 11.sp, color = TextMuted)
                        }
                    }
                    Text("›", fontSize = 22.sp, color = TextMuted)
                }
            }
        }

        item {
            Button(
                onClick = onNavigateInbox,
                modifier = Modifier.fillMaxWidth().height(64.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CardBg)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(36.dp).background(AccentCyan.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Inbox, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(20.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Direct Inboxes", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "SMS & WhatsApp",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = AccentCyan,
                                    modifier = Modifier
                                        .background(AccentCyan.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                            }
                            Text("Directly read phone SMS & WhatsApp tray", fontSize = 11.sp, color = TextMuted)
                        }
                    }
                    Text("›", fontSize = 22.sp, color = TextMuted)
                }
            }
        }

        item {
            Button(
                onClick = {
                    onQuickTest("upi://pay?pa=random123@ybl&am=1999&tn=refund")
                },
                modifier = Modifier.fillMaxWidth().height(64.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CardBg)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(36.dp).background(AccentCyan.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.QrCode, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(20.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Scan QR", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                            Text("Inspect UPI payment code before scanning", fontSize = 11.sp, color = TextMuted)
                        }
                    }
                    Text("›", fontSize = 22.sp, color = TextMuted)
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "1-TAP DEMO TEST MESSAGES",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 1.sp
            )
        }

        item {
            DemoItem(
                badge = "🔴 FRAUD RISK",
                badgeColor = AlertRose,
                title = "Scam Message (KYC Threat)",
                snippet = "Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz",
                onClick = { onQuickTest("Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz") }
            )
        }

        item {
            DemoItem(
                badge = "🟢 GENUINE",
                badgeColor = AccentGreen,
                title = "Genuine Bank OTP",
                snippet = "Your OTP is 482910. Do not share with anyone. - HDFC Bank",
                onClick = { onQuickTest("Your OTP is 482910. Do not share with anyone. - HDFC Bank") }
            )
        }

        item {
            DemoItem(
                badge = "🔴 FRAUD RISK",
                badgeColor = AlertRose,
                title = "Payment Scam (Prize Deposit)",
                snippet = "Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to receive your prize.",
                onClick = { onQuickTest("Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to receive your prize.") }
            )
        }
    }
}

@Composable
fun DemoItem(
    badge: String,
    badgeColor: Color,
    title: String,
    snippet: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardBg)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                Text(
                    text = badge,
                    fontSize = 10.sp,
                    color = badgeColor,
                    modifier = Modifier.background(badgeColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp)).padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(snippet, fontSize = 11.sp, color = TextMuted, maxLines = 1)
        }
    }
}

@Composable
fun CheckMessageScreen(
    messageInput: String,
    onMessageChange: (String) -> Unit,
    onPaste: () -> Unit,
    onClear: () -> Unit,
    onLoadExample: () -> Unit,
    onAnalyze: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text("Message Scanner", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextWhite)
            Text("Analyze SMS, WhatsApp forwards, or urgent notifications locally.", fontSize = 12.sp, color = TextMuted)
        }

        item {
            OutlinedTextField(
                value = messageInput,
                onValueChange = onMessageChange,
                modifier = Modifier.fillMaxWidth().height(160.dp),
                placeholder = { Text("Paste SMS text or message here...", fontSize = 13.sp, color = TextMuted) },
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AccentGreen,
                    unfocusedBorderColor = Color(0xFF334155),
                    focusedContainerColor = CardBg,
                    unfocusedContainerColor = CardBg,
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite
                )
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onPaste,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
                    ) {
                        Icon(Icons.Default.ContentPaste, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Paste Message", fontSize = 12.sp)
                    }

                    if (messageInput.isNotEmpty()) {
                        Button(
                            onClick = onClear,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
                        ) {
                            Text("Clear", fontSize = 12.sp, color = TextMuted)
                        }
                    }
                }

                Button(
                    onClick = onLoadExample,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
                ) {
                    Text("Example Message", fontSize = 12.sp, color = AccentCyan)
                }
            }
        }

        item {
            Button(
                onClick = onAnalyze,
                enabled = messageInput.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentGreen, disabledContainerColor = AccentGreen.copy(alpha = 0.3f))
            ) {
                Icon(Icons.Default.Shield, contentDescription = null, tint = DarkBg)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Analyze Message", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = DarkBg)
            }
        }

        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text("QUICK TEST PRESETS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }

        item {
            DemoItem(
                badge = "🔴 KYC Threat",
                badgeColor = AlertRose,
                title = "KYC Expiry Scam",
                snippet = "Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz",
                onClick = { onMessageChange("Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz") }
            )
        }

        item {
            DemoItem(
                badge = "🟢 Genuine",
                badgeColor = AccentGreen,
                title = "HDFC Bank OTP",
                snippet = "Your OTP is 482910. Do not share with anyone. - HDFC Bank",
                onClick = { onMessageChange("Your OTP is 482910. Do not share with anyone. - HDFC Bank") }
            )
        }

        item {
            DemoItem(
                badge = "🔴 Prize Scam",
                badgeColor = AlertRose,
                title = "Won ₹50,000 Advance Fee",
                snippet = "Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to receive your prize.",
                onClick = { onMessageChange("Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to receive your prize.") }
            )
        }
    }
}

@Composable
fun VerdictScreen(
    result: FraudAnalysisOutput,
    rawPayload: String,
    scanType: String,
    showWhy: Boolean,
    onToggleWhy: () -> Unit,
    onScanAnother: () -> Unit,
    onShare: () -> Unit
) {
    val v = result.verdict
    val badgeColor = when (v.level) {
        VerdictLevel.GENUINE -> AccentGreen
        VerdictLevel.SUSPICIOUS -> AlertAmber
        VerdictLevel.FRAUD_RISK -> AlertRose
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Column(
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                horizontalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier.size(72.dp).background(badgeColor.copy(alpha = 0.2f), CircleShape).border(3.dp, badgeColor, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (v.level == VerdictLevel.GENUINE) Icons.Default.CheckCircle else Icons.Default.Warning,
                        contentDescription = null,
                        tint = badgeColor,
                        modifier = Modifier.size(36.dp)
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = v.level.title,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = badgeColor
                )
                Text(
                    text = v.label,
                    fontSize = 12.sp,
                    color = TextMuted
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Risk Score: ${v.score}/100",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextWhite,
                        modifier = Modifier.background(CardBg, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                    Text(
                        text = "${v.confidence}% Confidence",
                        fontSize = 11.sp,
                        color = TextWhite,
                        modifier = Modifier.background(CardBg, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                    Text(
                        text = "${result.inferenceTimeMs}ms",
                        fontSize = 11.sp,
                        color = AccentGreen,
                        modifier = Modifier.background(CardBg, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
        }

        // Show Me Why Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onToggleWhy() },
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Show Me Why (5 Signal Breakdown)", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                        }
                        Icon(
                            imageVector = if (showWhy) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = null,
                            tint = TextMuted
                        )
                    }

                    if (showWhy) {
                        Spacer(modifier = Modifier.height(12.dp))
                        SignalRow("1. Urgency Pressure (25%)", v.signals.urgency)
                        SignalRow("2. Payment Contradiction (30%)", v.signals.contradiction)
                        SignalRow("3. Recipient Mismatch (25%)", v.signals.mismatch)
                        SignalRow("4. Scam Template Match (15%)", v.signals.template)
                        SignalRow("5. URL Risk (5%)", v.signals.urlRisk)

                        if (v.signals.explanations.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Signal Explanations:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                            v.signals.explanations.forEach { exp ->
                                Row(modifier = Modifier.padding(top = 4.dp)) {
                                    Text("• ", color = AccentCyan, fontSize = 12.sp)
                                    Text(exp, fontSize = 11.sp, color = TextWhite)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Safety Recommendation Box
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = badgeColor.copy(alpha = 0.15f)),
                modifier = Modifier.fillMaxWidth().border(1.dp, badgeColor.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Safety Recommendation:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = badgeColor)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(v.recommendation, fontSize = 12.sp, color = TextWhite)
                }
            }
        }

        // Analyzed Text Preview
        item {
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CardBgDark),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text("Analyzed Payload ($scanType):", fontSize = 10.sp, color = TextMuted)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(rawPayload, fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = TextWhite)
                }
            }
        }

        // Buttons: Scan Another & Share Verdict
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onScanAnother,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = CardBg)
                ) {
                    Text("Scan Another", fontSize = 13.sp, color = TextWhite)
                }

                Button(
                    onClick = onShare,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentGreen)
                ) {
                    Text("Share Verdict", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = DarkBg)
                }
            }
        }
    }
}

@Composable
fun SignalRow(label: String, score: Int) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 12.sp, color = TextMuted)
        Text(
            text = "$score / 100",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = if (score > 40) AlertRose else TextWhite
        )
    }
}

@Composable
fun HistoryScreen(
    records: List<ScanRecord>,
    onDeleteAll: () -> Unit,
    onSelectRecord: (ScanRecord) -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Local Scan History", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                    Text("Encrypted on-device SQLite / Room", fontSize = 11.sp, color = TextMuted)
                }
                if (records.isNotEmpty()) {
                    Button(
                        onClick = onDeleteAll,
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AlertRose.copy(alpha = 0.2f))
                    ) {
                        Text("Delete All History", fontSize = 11.sp, color = AlertRose)
                    }
                }
            }
        }

        if (records.isEmpty()) {
            item {
                Box(
                    modifier = Modifier.fillMaxWidth().height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No scans recorded yet.\nMessages are evaluated 100% offline.", color = TextMuted, fontSize = 13.sp)
                }
            }
        } else {
            items(records) { record ->
                val badgeColor = when (record.verdict) {
                    "GENUINE" -> AccentGreen
                    "SUSPICIOUS" -> AlertAmber
                    else -> AlertRose
                }
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { onSelectRecord(record) },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = CardBg)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = record.verdict,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = badgeColor
                            )
                            Text(
                                text = dateFormat.format(Date(record.timestamp)),
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(record.preview, fontSize = 12.sp, color = TextWhite)
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Score: ${record.score}/100", fontSize = 10.sp, color = TextMuted)
                            Text("Type: ${record.type}", fontSize = 10.sp, color = TextMuted)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AboutScreen() {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text("About MobiGuard", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextWhite)
            Text("On-Device AI Fraud Detection Engine", fontSize = 12.sp, color = TextMuted)
        }

        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Architecture Stack", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                    Text("• Layer 1: Quantized DistilBERT TFLite NLP model (~24.8MB INT8) for sub-300ms semantic inference.", fontSize = 12.sp, color = TextMuted)
                    Text("• Layer 2: Native Kotlin RuleEngine with 50+ localized Indian scam patterns.", fontSize = 12.sp, color = TextMuted)
                    Text("• Layer 3: UPI and domain integrity analyzer.", fontSize = 12.sp, color = TextMuted)
                    Text("• Layer 4: Room Local SQLite storage with AES Keystore encryption.", fontSize = 12.sp, color = TextMuted)
                }
            }
        }

        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("APK Build & Model Placement", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = AccentGreen)
                    Text("Place TFLite assets in:", fontSize = 12.sp, color = TextWhite)
                    Text("app/src/main/assets/fraud_model.tflite\napp/src/main/assets/vocab.json", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = AccentCyan)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Run `./gradlew assembleDebug` to build `app-debug.apk`.", fontSize = 12.sp, color = TextMuted)
                }
            }
        }

        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBgDark)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Responsible AI Disclaimer", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                    Text(
                        "MobiGuard delivers probabilistic fraud decision support on-device. It never declares communications 100% safe or 100% fraud. Users should independently verify suspicious communications through official bank applications.",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DirectInboxScreen(
    smsPermissionGranted: Boolean,
    onRequestSmsPermission: () -> Unit,
    notificationAccessGranted: Boolean,
    onOpenNotificationSettings: () -> Unit,
    interceptedMessages: List<InterceptedMessage>,
    onReadSmsInbox: () -> List<SmsInboxItem>,
    onScanMessage: (String, String) -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) } // 0 = SMS Inbox, 1 = WhatsApp Shield
    var smsList by remember { mutableStateOf<List<SmsInboxItem>>(emptyList()) }
    var isLoadingSms by remember { mutableStateOf(false) }
    var onlyScamsFilter by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(smsPermissionGranted) {
        if (smsPermissionGranted) {
            isLoadingSms = true
            smsList = withContext(Dispatchers.IO) { onReadSmsInbox() }
            isLoadingSms = false
        }
    }

    val filteredSms = remember(smsList, onlyScamsFilter) {
        if (!onlyScamsFilter) smsList else smsList.filter { it.isProbableScam }
    }

    val dateFormat = remember { SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Top Header
        item {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Direct Inboxes", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "DIRECT READ",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = AccentGreen,
                        modifier = Modifier
                            .background(AccentGreen.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                            .border(1.dp, AccentGreen.copy(alpha = 0.3f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Text("Directly inspect SMS messages & incoming WhatsApp notifications", fontSize = 12.sp, color = TextMuted)
            }
        }

        // Sub-tabs: SMS Inbox vs WhatsApp Live Shield
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBg, RoundedCornerShape(12.dp))
                    .padding(4.dp)
            ) {
                Button(
                    onClick = { selectedTab = 0 },
                    modifier = Modifier.weight(1f).height(38.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (selectedTab == 0) AccentCyan.copy(alpha = 0.2f) else Color.Transparent,
                        contentColor = if (selectedTab == 0) AccentCyan else TextMuted
                    ),
                    contentPadding = PaddingValues(horizontal = 8.dp)
                ) {
                    Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("SMS Inbox", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                Button(
                    onClick = { selectedTab = 1 },
                    modifier = Modifier.weight(1f).height(38.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (selectedTab == 1) AccentGreen.copy(alpha = 0.2f) else Color.Transparent,
                        contentColor = if (selectedTab == 1) AccentGreen else TextMuted
                    ),
                    contentPadding = PaddingValues(horizontal = 8.dp)
                ) {
                    Icon(Icons.Default.Notifications, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("WhatsApp Shield", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    if (notificationAccessGranted) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Box(modifier = Modifier.size(6.dp).background(AccentGreen, CircleShape))
                    }
                }
            }
        }

        // CONTENT: SMS INBOX
        if (selectedTab == 0) {
            if (!smsPermissionGranted) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth().border(1.dp, AccentCyan.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier.size(36.dp).background(AccentCyan.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Lock, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(20.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("Direct SMS Inbox Reading", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                    Text("Requires Android READ_SMS permission", fontSize = 11.sp, color = TextMuted)
                                }
                            }
                            Text(
                                "MobiGuard inspects your phone's SMS inbox 100% locally on this device using Android's Telephony ContentResolver. Messages are never sent to any external server or cloud.",
                                fontSize = 12.sp,
                                color = TextMuted
                            )
                            Button(
                                onClick = onRequestSmsPermission,
                                modifier = Modifier.fillMaxWidth().height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentCyan)
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = DarkBg, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Grant Direct SMS Permission", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = DarkBg)
                            }
                        }
                    }
                }
            } else {
                // SMS Permission Granted: Status & Refresh controls
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isLoadingSms) "Reading device inbox..." else "${filteredSms.size} SMS loaded",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(
                                selected = onlyScamsFilter,
                                onClick = { onlyScamsFilter = !onlyScamsFilter },
                                label = { Text(if (onlyScamsFilter) "Flagged Only" else "All SMS", fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AlertRose.copy(alpha = 0.2f),
                                    selectedLabelColor = AlertRose,
                                    containerColor = CardBg,
                                    labelColor = TextMuted
                                )
                            )
                            IconButton(
                                onClick = {
                                    coroutineScope.launch {
                                        isLoadingSms = true
                                        smsList = withContext(Dispatchers.IO) { onReadSmsInbox() }
                                        isLoadingSms = false
                                    }
                                },
                                modifier = Modifier.size(36.dp).background(CardBg, RoundedCornerShape(8.dp))
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = AccentGreen, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }

                if (filteredSms.isEmpty() && !isLoadingSms) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = CardBg),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp).fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text("No messages found in phone inbox", color = TextWhite, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Text("Tap the refresh button to reload recent SMS messages.", color = TextMuted, fontSize = 11.sp)
                            }
                        }
                    }
                } else {
                    items(filteredSms) { item ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = CardBg),
                            border = if (item.isProbableScam) androidx.compose.foundation.BorderStroke(1.dp, AlertRose.copy(alpha = 0.5f)) else null
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = item.sender,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextWhite
                                        )
                                        if (item.isProbableScam) {
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = item.scamCategory,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = AlertRose,
                                                modifier = Modifier
                                                    .background(AlertRose.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Text(
                                        text = dateFormat.format(Date(item.timestamp)),
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                }
                                Text(
                                    text = item.body,
                                    fontSize = 12.sp,
                                    color = TextWhite,
                                    lineHeight = 17.sp
                                )
                                Button(
                                    onClick = { onScanMessage(item.body, "SMS") },
                                    modifier = Modifier.fillMaxWidth().height(36.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (item.isProbableScam) AlertRose.copy(alpha = 0.2f) else AccentGreen.copy(alpha = 0.15f),
                                        contentColor = if (item.isProbableScam) AlertRose else AccentGreen
                                    )
                                ) {
                                    Icon(Icons.Default.Shield, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Scan with AI Engine", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }

        // CONTENT: WHATSAPP LIVE SHIELD
        if (selectedTab == 1) {
            if (!notificationAccessGranted) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth().border(1.dp, AccentGreen.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier.size(36.dp).background(AccentGreen.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Notifications, contentDescription = null, tint = AccentGreen, modifier = Modifier.size(20.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("Real-Time WhatsApp Protection", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                    Text("Requires Android Notification Access", fontSize = 11.sp, color = TextMuted)
                                }
                            }
                            Text(
                                "Because Android isolates WhatsApp and messaging apps in secure sandboxes, MobiGuard protects your chats without breaking encryption by evaluating incoming notification alerts in real-time.",
                                fontSize = 12.sp,
                                color = TextMuted
                            )
                            Button(
                                onClick = onOpenNotificationSettings,
                                modifier = Modifier.fillMaxWidth().height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentGreen)
                            ) {
                                Icon(Icons.Default.Settings, contentDescription = null, tint = DarkBg, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Open Notification Settings", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = DarkBg)
                            }
                        }
                    }
                }
            } else {
                // Notification access active
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().border(1.dp, AccentGreen.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(8.dp).background(AccentGreen, CircleShape))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text("WhatsApp Live Shield Active", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = AccentGreen)
                                    Text("Evaluating incoming scam alerts on-device", fontSize = 10.sp, color = TextMuted)
                                }
                            }
                            Button(
                                onClick = {
                                    MobiGuardNotificationListener.addIntercepted(
                                        sender = "+91 98231 44210 (WhatsApp)",
                                        text = "Dear customer, your electricity will be disconnected tonight at 9:30 PM due to unpaid bill. Pay immediately: bit.ly/power-bill-wa",
                                        appName = "WhatsApp",
                                        isScam = true,
                                        category = "Electricity Threat"
                                    )
                                },
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentGreen.copy(alpha = 0.15f)),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text("Simulate Alert", fontSize = 10.sp, color = AccentGreen)
                            }
                        }
                    }
                }

                if (interceptedMessages.isEmpty()) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = CardBg),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp).fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.Notifications, contentDescription = null, tint = TextMuted, modifier = Modifier.size(32.dp))
                                Text("Waiting for incoming WhatsApp alerts...", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                Text(
                                    "When someone messages you on WhatsApp or Telegram, MobiGuard will instantly inspect the notification for fraud indicators.",
                                    fontSize = 11.sp,
                                    color = TextMuted,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    items(interceptedMessages) { msg ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = CardBg),
                            border = if (msg.isSuspectedScam) androidx.compose.foundation.BorderStroke(1.dp, AlertRose.copy(alpha = 0.5f)) else null
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = msg.sender,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextWhite
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = msg.appName,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = AccentCyan,
                                            modifier = Modifier
                                                .background(AccentCyan.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                                .padding(horizontal = 4.dp, vertical = 2.dp)
                                        )
                                    }
                                    Text(
                                        text = dateFormat.format(Date(msg.timestamp)),
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                }
                                if (msg.isSuspectedScam) {
                                    Text(
                                        text = "⚠️ Suspected Scam: ${msg.scamCategory}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = AlertRose
                                    )
                                }
                                Text(
                                    text = msg.text,
                                    fontSize = 12.sp,
                                    color = TextWhite,
                                    lineHeight = 17.sp
                                )
                                Button(
                                    onClick = { onScanMessage(msg.text, "WHATSAPP") },
                                    modifier = Modifier.fillMaxWidth().height(36.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (msg.isSuspectedScam) AlertRose.copy(alpha = 0.2f) else AccentGreen.copy(alpha = 0.15f),
                                        contentColor = if (msg.isSuspectedScam) AlertRose else AccentGreen
                                    )
                                ) {
                                    Icon(Icons.Default.Shield, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Full AI Scam Evaluation", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
