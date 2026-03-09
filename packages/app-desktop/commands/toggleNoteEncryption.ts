import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import MasterKey, { SOURCE_LOCAL_VAULT } from '@joplin/lib/models/MasterKey';
import { NoteEntity } from '@joplin/lib/services/database/types';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { stateUtils } from '@joplin/lib/reducer';
import { CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { DesktopCommandContext } from '../services/commands/types';
import dialogs from '../gui/dialogs';

export const declaration: CommandDeclaration = {
	name: 'toggleNoteEncryption',
	label: () => _('Toggle note encryption'),
	iconName: 'fas fa-lock',
};

const promptForPassword = async (message: string) => {
	return dialogs.prompt(message, _('Local encrypted vault'), '', { type: 'password' });
};

const createAndLoadLocalVaultKey = async (): Promise<boolean> => {
	const password = await promptForPassword(_('Set a password for this note vault:'));
	if (password === null) return false;
	if (!password) {
		await dialogs.alert(_('Please provide a password.'));
		return false;
	}

	const confirmPassword = await promptForPassword(_('Confirm password:'));
	if (confirmPassword === null) return false;
	if (confirmPassword !== password) {
		await dialogs.alert(_('Passwords do not match.'));
		return false;
	}

	let localMasterKey = await EncryptionService.instance().generateMasterKey(password);
	localMasterKey.source = SOURCE_LOCAL_VAULT;
	localMasterKey = await MasterKey.save(localMasterKey);
	await EncryptionService.instance().loadMasterKey(localMasterKey, password);
	return true;
};

const ensureLocalVaultKeyLoaded = async (): Promise<boolean> => {
	const localMasterKey = await MasterKey.localVaultMasterKey();
	if (!localMasterKey) {
		return createAndLoadLocalVaultKey();
	}

	if (EncryptionService.instance().isMasterKeyLoaded(localMasterKey)) return true;

	const password = await promptForPassword(_('Enter your local vault password:'));
	if (password === null) return false;

	try {
		await EncryptionService.instance().loadMasterKey(localMasterKey, password);
		if (!EncryptionService.instance().isMasterKeyLoaded(localMasterKey)) {
			await dialogs.alert(_('Invalid password.'));
			return false;
		}
		return true;
	} catch (error) {
		const message = error instanceof Error ? error.message : `${error}`;
		await dialogs.alert(_('Could not unlock local vault: %s', message));
		return false;
	}
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: DesktopCommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);
			if (!noteId) return;

			let note = await Note.load(noteId);
			if (!note) return;

			if (note.is_locally_encrypted || !(await MasterKey.localVaultMasterKey())) {
				const keyReady = await ensureLocalVaultKeyLoaded();
				if (!keyReady) return;
				note = await Note.load(noteId);
				if (!note) return;
			}

			const updatedNote: NoteEntity = {
				...note,
				is_locally_encrypted: note.is_locally_encrypted ? 0 : 1,
			};
			await Note.save(updatedNote, { userSideValidation: true });
		},
		enabledCondition: 'oneNoteSelected && !noteIsReadOnly && (!modalDialogVisible || gotoAnythingVisible)',
	};
};
