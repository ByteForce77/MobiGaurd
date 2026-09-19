package com.mobiguard.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ScanDao {
    @Query("SELECT * FROM scan_history ORDER BY timestamp DESC LIMIT 50")
    fun getAllScans(): Flow<List<ScanRecord>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScan(record: ScanRecord)

    @Query("DELETE FROM scan_history")
    suspend fun deleteAllScans()

    @Query("SELECT COUNT(*) FROM scan_history")
    suspend fun getScanCount(): Int
}
