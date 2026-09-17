; Custom NSIS hooks — see https://www.electron.build/configuration/nsis#custom-nsis-script
;
; Uninstalling used to just delete the app's files, leaving the Explorer
; sync-root registration (StorageProviderSyncRootManager) orphaned forever —
; that's what caused entries to survive reinstalls. This runs the app itself
; with a special flag, before its files are removed, so it can unregister
; itself using the real Windows API (the same one that successfully cleans
; up on sign-out) rather than trying to poke the registry directly from NSIS.
!macro customUnInstall
  DetailPrint "Removing Skylyer's Explorer sync-root registration..."
  ExecWait '"$INSTDIR\Skylyer.exe" --skylyer-uninstall-cleanup'
!macroend
