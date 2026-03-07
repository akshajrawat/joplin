# Joplin Local Vault (GSoC Proof of Concept) 🔒

This branch contains the Proof of Concept (PoC) for the **Local-Only Encrypted Vault** feature, proposed for Google Summer of Code. 

This feature allows users to selectively encrypt individual notes on their local device using AES-256-GCM. The architecture intercepts the SQLite database layer to ensure the plaintext is never written to disk, and bypasses the `SyncInfoCache` to guarantee the local master key never leaks to the cloud sync engine.

![Joplin Local Vault Architecture](assets/architecture.png)

## 🎯 Scope & Purpose of this PoC

The **sole purpose** of this PoC is to prove that the most difficult backend architectural hurdles of this proposal are solvable. Specifically, it validates:
1. **Cloud Sync Isolation:** Successfully creating a master key (`source: 2`) that the Joplin sync engine ignores, ensuring the local password never leaves the device.
2. **The Database Firewall:** Intercepting `Note.save()` to strip transient UI state (`is_local_session_unlocked`) before hitting the physical disk, preventing fatal `SQLITE_ERROR` schema crashes.
3. **RAM-Only JIT Decryption:** Proving that ciphertext can be loaded from the disk and decrypted Just-In-Time (JIT) into volatile memory without writing plaintext back to the database.



### 🚧 What is NOT included in this PoC (Planned for GSoC):
Because this is strictly a backend architecture validation, the following features are intentionally omitted and will be the focus of the GSoC coding period:
* **Dedicated React Lock Screen:** The PoC uses the "Toggle note encryption" context menu command to prompt for passwords and unlock notes as a temporary workaround. The final implementation will feature a native, in-editor React lock-screen component that safely unmounts the TinyMCE/CodeMirror editors.
* **Resource/Attachment Encryption:** This PoC only encrypts text. Encrypting physical files (images/PDFs) in the `resources/` directory is planned as a stretch goal.
* **Auto-Lock Timer:** Automatically flushing the master key from RAM after a period of inactivity.
* **Master Key Management UI:** Settings pages to change the local vault password or manage the vault globally.

---

## 🚀 Environment Setup

To test this feature locally, you will need Node.js and Yarn installed on your machine.

### 1. Install Dependencies
Open your terminal in the root directory of this repository and run:
```
yarn
```

### 2. Run the Desktop App
Navigate into the desktop application package and start the Electron environment:
```
cd packages/app-desktop
yarn start
```

### 3. 🧪 Testing the Encryption Workflow
Once the Joplin development app is running, follow these exact steps to test the database firewall and local encryption:

1. Create a Note: Create a new note and type some test content into the body.

2. Lock the Note: Right-click the note in the middle Note List column. From the context menu, click Toggle note encryption.

3. Enter Password: A prompt will appear. Enter and confirm a password. The note is now encrypted on the disk! (The plaintext has been wiped from the SQLite body column and replaced with ciphertext).

4. Kill the Session: Close the Electron app completely (you can press Ctrl + C in your terminal to stop the process). This flushes the decrypted master key from volatile RAM.

5. Verify Persistence: Run yarn start again to reopen the app. Click on the note you just encrypted. You will see that the note content is completely hidden/empty because the vault is locked.

6. Unlock the Note: Right-click the note and click Toggle note encryption again. Enter your password. The note will decrypt and your content will reappear!

Technical Note for Reviewers: This PoC demonstrates the strict separation of transient React UI state and physical SQLite schema. The encrypted state persists across reboots without causing SQLITE_ERROR: no such column crashes, and the master key uses source: 2 to successfully evade cloud synchronization.

