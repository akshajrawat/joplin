# Joplin Local Vault (GSoC Proof of Concept) 🔒

This branch contains the Proof of Concept (PoC) for the **Local-Only Encrypted Vault** feature, proposed for Google Summer of Code 2026. 

The goal of this feature is to solve a long-standing privacy gap: while Joplin is famously secure in the cloud (via E2EE), the local SQLite database remains in plaintext. This PoC demonstrates a working "Database Firewall" that ensures sensitive note content is encrypted with AES-256-GCM before it ever touches the local disk, without interfering with Joplin's existing sync engine.


## 🎯 Scope & Purpose of this PoC

Instead of building out every minor feature, I focused this PoC entirely on proving that the three riskiest architectural hurdles of my proposal are solvable. Specifically, it validates:

1. **Cloud Sync Isolation (`local_master_key_id`):** Successfully creating a master key (`source: 2`) that the Joplin sync engine is hard-coded to ignore, ensuring the local password never leaves the device.
2. **The Database Firewall:** Intercepting `Note.save()` to seamlessly strip transient React UI state (`is_local_session_unlocked`) before hitting the physical disk. This prevents the fatal `SQLITE_ERROR: no such column` crashes that normally plague model extensions.
3. **RAM-Only JIT Decryption & UI Interception:** Proving that ciphertext can be loaded from the disk, decrypted Just-In-Time (JIT) into volatile memory, and used to seamlessly swap out the standard text editors for a native React `<VaultLockScreen />` overlay.

### 🚧 What is NOT included in this PoC (Planned for GSoC):
To keep the PoC stable and focused, I have intentionally reserved the following for the GSoC coding period:
* **Recursive Folder Cascades:** Locking a notebook to automatically encrypt all nested notes.
* **Resource/Attachment Encryption:** Encrypting physical files (images/PDFs) in the `resources/` directory using an OS-level temporary cache.
* **Auto-Lock Timer:** Automatically flushing the master key from RAM after a period of inactivity.
* **Global Key Management UI:** Settings pages to change the local vault password or manage the vault globally.

---

## 🚀 Environment Setup

To test this feature locally, you will need Node.js and Yarn installed on your machine.

### 1. Install Dependencies
Open your terminal in the root directory of this repository and run:
```bash
yarn
```

### 2. Run the Desktop App
Navigate into the desktop application package and start the Electron environment:
```bash
cd packages/app-desktop
yarn start
```

### 3. 🧪 Testing the Encryption Workflow
Once the Joplin development app is running, follow these exact steps to test the database firewall and local encryption:

* Create a Note: Create a new note and type some test content into the body.

* Lock the Note: Right-click the note in the middle Note List column. From the context menu, click Lock/Unlock Note.

* Enter Password: A prompt will appear. Enter a password. Under the hood: The plaintext is wiped from the SQLite body column and moved to local_cipher_text!

* Kill the Session: Close the Electron app completely (you can press Ctrl + C in your terminal to stop the process). This safely flushes the decrypted master key from volatile RAM.

* Verify Persistence: Run yarn start again to reopen the app. Click on the note you just encrypted. Instead of your text, you will be greeted by the new Vault Lock Screen UI!

* Unlock the Note: Enter your password directly into the Lock Screen. The note will seamlessly decrypt in RAM and your content will reappear in the editor.

### Technical Note for Reviewers: This PoC demonstrates the strict separation of transient React UI state and physical SQLite schema. The encrypted state persists across reboots, uses a "Safety Fetch" to prevent auto-save data loss, and successfully coexists alongside Joplin's standard E2EE cloud sync.