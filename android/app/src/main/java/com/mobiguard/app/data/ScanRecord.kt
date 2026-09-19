package com.mobiguard.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "scan_history")
data class ScanRecord(
    @PrimaryKey
    val id: String,
    val timestamp: Long,
    val type: String, // "SMS", "QR", "SCREENSHOT", "URL"
    val preview: String,
    val verdict: String, // "GENUINE", "SUSPICIOUS", "FRAUD RISK"
    val score: Int,
    val confidence: Int,
    val rawText: String,
    val recommendation: String,
    val urgencyScore: Int = 0,
    val contradictionScore: Int = 0,
    val mismatchScore: Int = 0,
    val templateScore: Int = 0,
    val urlRiskScore: Int = 0,
    val explanationText: String = ""
)
