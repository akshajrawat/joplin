"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = exports.declaration = void 0;
const locale_1 = require("@joplin/lib/locale");
const Note_1 = require("@joplin/lib/models/Note");
const MasterKey_1 = require("@joplin/lib/models/MasterKey");
const EncryptionService_1 = require("@joplin/lib/services/e2ee/EncryptionService");
const reducer_1 = require("@joplin/lib/reducer");
const dialogs_1 = require("../gui/dialogs");
exports.declaration = {
    name: 'toggleNoteEncryption',
    label: () => (0, locale_1._)('Toggle note encryption'),
    iconName: 'fas fa-lock',
};
const promptForPassword = async (message) => {
    return dialogs_1.default.prompt(message, (0, locale_1._)('Local encrypted vault'), '', { type: 'password' });
};
const createAndLoadLocalVaultKey = async () => {
    const password = await promptForPassword((0, locale_1._)('Set a password for this note vault:'));
    if (password === null)
        return false;
    if (!password) {
        await dialogs_1.default.alert((0, locale_1._)('Please provide a password.'));
        return false;
    }
    const confirmPassword = await promptForPassword((0, locale_1._)('Confirm password:'));
    if (confirmPassword === null)
        return false;
    if (confirmPassword !== password) {
        await dialogs_1.default.alert((0, locale_1._)('Passwords do not match.'));
        return false;
    }
    let localMasterKey = await EncryptionService_1.default.instance().generateMasterKey(password);
    localMasterKey.source = MasterKey_1.SOURCE_LOCAL_VAULT;
    localMasterKey = await MasterKey_1.default.save(localMasterKey);
    await EncryptionService_1.default.instance().loadMasterKey(localMasterKey, password);
    return true;
};
const ensureLocalVaultKeyLoaded = async () => {
    const localMasterKey = await MasterKey_1.default.localVaultMasterKey();
    if (!localMasterKey) {
        return createAndLoadLocalVaultKey();
    }
    if (EncryptionService_1.default.instance().isMasterKeyLoaded(localMasterKey))
        return true;
    const password = await promptForPassword((0, locale_1._)('Enter your local vault password:'));
    if (password === null)
        return false;
    try {
        await EncryptionService_1.default.instance().loadMasterKey(localMasterKey, password);
        if (!EncryptionService_1.default.instance().isMasterKeyLoaded(localMasterKey)) {
            await dialogs_1.default.alert((0, locale_1._)('Invalid password.'));
            return false;
        }
        return true;
    }
    catch (error) {
        await dialogs_1.default.alert((0, locale_1._)('Could not unlock local vault: %s', error.message));
        return false;
    }
};
const runtime = () => {
    return {
        execute: async (context, noteId = null) => {
            noteId = noteId || reducer_1.stateUtils.selectedNoteId(context.state);
            if (!noteId)
                return;
            let note = await Note_1.default.load(noteId);
            if (!note)
                return;
            if (note.is_locally_encrypted || !(await MasterKey_1.default.localVaultMasterKey())) {
                const keyReady = await ensureLocalVaultKeyLoaded();
                if (!keyReady)
                    return;
                note = await Note_1.default.load(noteId);
                if (!note)
                    return;
            }
            const updatedNote = {
                ...note,
                is_locally_encrypted: note.is_locally_encrypted ? 0 : 1,
            };
            await Note_1.default.save(updatedNote, { userSideValidation: true });
        },
        enabledCondition: 'oneNoteSelected && !noteIsReadOnly && (!modalDialogVisible || gotoAnythingVisible)',
    };
};
exports.runtime = runtime;
