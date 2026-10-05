# Tournament Desk Runbook & Disaster Recovery Plan

## 1. Local Venue Setup
1. **Power & Network**:
   - Ensure the desk laptop or tablet is connected to a reliable local area network or hotspot.
   - If the venue network drops, the application displays **BROWSER OFFLINE** or **SERVER DISCONNECTED**.
   - Do NOT continue attempting authoritative score changes while disconnected. The system will safely reconnect and sync once connectivity is restored.
2. **Operator Credentials**:
   - Only provide `SCOREKEEPER` accounts to regular desk operators.
   - `OFFICIAL` accounts should be reserved for head referees and tournament directors.
   - `ADMIN` account should only be used by technical organizers for tournament configuration and emergency unlocks.

## 2. Backup & Recovery Policy
1. **Periodic PostgreSQL Dumps**:
   - For PostgreSQL in production, execute automated WAL archiving or scheduled snapshot backups:
   ```bash
   pg_dump -U postgres -d scorecard_db -F c -b -v -f ./backups/scorecard_$(date +%Y%m%d_%H%M%S).dump
   ```
2. **Embedded Database Data Directory**:
   - When using the embedded PostgreSQL engine, the complete database is persisted in `./.pgdata/`.
   - Backup the `./.pgdata/` directory before and after tournament sessions.
3. **Disaster Restoration Procedure**:
   - Stop the backend process: `npm run stop`
   - Restore database:
   ```bash
   pg_restore -U postgres -d scorecard_db -v ./backups/scorecard_target.dump
   ```
   - Restart backend: `npm run start`
   - Run reconciliation test on all matches:
   ```bash
   curl -H "Authorization: Bearer <OFFICIAL_TOKEN>" http://localhost:4000/api/v1/matches/<MATCH_ID>/reconcile
   ```

## 3. Dispute Resolution Workflow
1. When a coach, player, or scorekeeper disputes a score:
   - Navigate to the match and click **View Full Audit History**.
   - Review each score increment in sequence, including the exact timestamp, actor username, and score increment value.
   - Check the **Integrity Verified** reconciliation box to prove that the current score matches the sum of recorded events.
2. If an erroneous score was confirmed:
   - Have the designated tournament **Official** open the **Correction** modal on the specific erroneous event.
   - Enter the official reason (e.g. *"Line judge overruled point; scorekeeper inadvertently pressed +1 twice"*).
   - Apply the correction. The reversal will appear in the event log with the reason, and the score will update immediately without erasing history.
3. Once a match is complete:
   - Official clicks **Finish Match** followed by **Lock Official Result**.
   - Once locked, normal scorekeepers are strictly blocked from editing.
