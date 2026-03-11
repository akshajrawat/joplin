import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
// import Folder from '@joplin/lib/models/Folder';
import MasterKey, { SOURCE_LOCAL_VAULT } from '@joplin/lib/models/MasterKey';
import BaseModel from '@joplin/lib/BaseModel';
import dialogs from '../../dialogs';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';

export const declaration: CommandDeclaration = {
	name: 'toggleLocalVault',
	label: () => _('Lock/Unlock Note'),
};

const loadMasterKeyById = async (id: string): Promise<MasterKeyEntity> => {
	return await BaseModel.db().selectOne('SELECT * FROM master_keys WHERE id = ?', [id]);
};

const promptAndLoadMasterKey = async (masterKeyId: string): Promise<boolean> => {
	const masterKey = await loadMasterKeyById(masterKeyId);
	if (!masterKey) throw new Error(`Master key not found: ${masterKeyId}`);

	const password = await dialogs.prompt(_('Enter vault password'), _('Unlock Local Vault'));
	if (!password) return false;

	await EncryptionService.instance().loadMasterKey(masterKey, password, false);
	return true;
};

const createAndLoadLocalVaultKey = async (): Promise<MasterKeyEntity|null> => {
	const password = await dialogs.prompt(_('Set a vault password'), _('Local Vault'));
	if (!password) return null;

	let masterKey = await EncryptionService.instance().generateMasterKey(password);
	masterKey = {
		...masterKey,
		source: SOURCE_LOCAL_VAULT,
	};

	masterKey = await MasterKey.save(masterKey);
	await EncryptionService.instance().loadMasterKey(masterKey, password, false);
	return masterKey;
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			const selectedNoteId = noteIds?.length ? noteIds[0] : context.state.selectedNoteIds?.[0];
			// const selectedFolderId = context.state.selectedFolderId;

			if (selectedNoteId) {
				let note = await Note.load(selectedNoteId);
				if (!note) return;

				if (note.is_locally_encrypted === 1) {
					if (note.local_master_key_id) {
						const isLoaded = EncryptionService.instance().isMasterKeyLoaded({ id: note.local_master_key_id });
						if (!isLoaded) {
							const unlocked = await promptAndLoadMasterKey(note.local_master_key_id);
							if (!unlocked) return;
							note = await Note.load(selectedNoteId);
						}
					}

					await Note.save({
						id: note.id,
						body: note.body,
						is_locally_encrypted: 0,
						local_cipher_text: '',
						local_master_key_id: '',
					}, { userSideValidation: true });
				} else {
					const masterKey = await createAndLoadLocalVaultKey();
					if (!masterKey) return;

					await Note.save({
						id: note.id,
						body: note.body,
						is_locally_encrypted: 1,
						local_master_key_id: masterKey.id,
					}, { userSideValidation: true });
				}

				return;
			}

		},
	};
};