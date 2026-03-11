import * as React from 'react';
import { useCallback, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import BaseModel from '@joplin/lib/BaseModel';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';

interface Props {
	noteId: string;
	onUnlocked: ()=> Promise<void>|void;
}

const rootStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'center',
	alignItems: 'center',
	height: '100%',
	gap: 12,
	padding: 24,
};

const inputStyle: React.CSSProperties = {
	minWidth: 280,
	padding: '8px 10px',
};

const buttonStyle: React.CSSProperties = {
	padding: '8px 12px',
	cursor: 'pointer',
};

const loadMasterKeyById = async (id: string): Promise<MasterKeyEntity> => {
	return await BaseModel.db().selectOne('SELECT * FROM master_keys WHERE id = ?', [id]);
};

const VaultLockScreen: React.FC<Props> = ({ noteId, onUnlocked }) => {
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const onSubmit = useCallback(async (event: React.FormEvent) => {
		event.preventDefault();
		if (!password) return;

		setLoading(true);
		setError('');

		try {
			const note = await Note.load(noteId, { fields: ['id', 'local_master_key_id'] });
			if (!note?.local_master_key_id) throw new Error(_('This note does not have a local vault key.'));

			const masterKey = await loadMasterKeyById(note.local_master_key_id);
			if (!masterKey) throw new Error(_('Master key not found.'));

			await EncryptionService.instance().loadMasterKey(masterKey, password, false);
			await Promise.resolve(onUnlocked());
		} catch (error) {
			setError(error.message || _('Could not unlock note.'));
		} finally {
			setLoading(false);
		}
	}, [noteId, password, onUnlocked]);

	return (
		<div style={rootStyle}>
			<div style={{ fontSize: 36 }}><i className="fas fa-lock" /></div>
			<h2>{_('This note is locked in your local vault')}</h2>
			<form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
				<input
					autoFocus={true}
					type="password"
					placeholder={_('Vault password')}
					value={password}
					onChange={event => setPassword(event.target.value)}
					style={inputStyle}
				/>
				<button type="submit" style={buttonStyle} disabled={loading}>{loading ? _('Unlocking...') : _('Unlock')}</button>
			</form>
			{error ? <div style={{ color: 'var(--joplin-color-error, #c00)' }}>{error}</div> : null}
		</div>
	);
};

export default VaultLockScreen;