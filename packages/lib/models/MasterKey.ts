import BaseModel from '../BaseModel';
import { MasterKeyEntity } from '../services/e2ee/types';
import { localSyncInfo, saveLocalSyncInfo } from '../services/synchronizer/syncInfoUtils';
import BaseItem from './BaseItem';
import uuid from '../uuid';

export const SOURCE_LOCAL_VAULT = 2;

export default class MasterKey extends BaseItem {
	public static tableName() {
		return 'master_keys';
	}

	public static modelType() {
		return BaseModel.TYPE_MASTER_KEY;
	}

	public static encryptionSupported() {
		return false;
	}

	public static latest() {
		let output: MasterKeyEntity = null;
		const syncInfo = localSyncInfo();
		for (const mk of syncInfo.masterKeys) {
			if (!output || output.updated_time < mk.updated_time) {
				output = mk;
			}
		}
		return output;
	}

	public static allWithoutEncryptionMethod(masterKeys: MasterKeyEntity[], methods: number[]) {
		return masterKeys.filter(m => !methods.includes(m.encryption_method));
	}

	public static async all(): Promise<MasterKeyEntity[]> {
		return localSyncInfo().masterKeys;
	}

	public static async allIds(): Promise<string[]> {
		return localSyncInfo().masterKeys.map(k => k.id);
	}

	public static async count(): Promise<number> {
		return localSyncInfo().masterKeys.length;
	}

	public static async load(id: string): Promise<MasterKeyEntity> {
		return localSyncInfo().masterKeys.find(mk => mk.id === id);
	}

	public static async localVaultMasterKey(): Promise<MasterKeyEntity> {
		return this.db().selectOne('SELECT * FROM master_keys WHERE source = ? ORDER BY updated_time DESC LIMIT 1', [SOURCE_LOCAL_VAULT]);
	}


	public static async save(o: MasterKeyEntity): Promise<MasterKeyEntity> {
		const syncInfo = localSyncInfo();

		const masterKey = { ...o };
		if (!masterKey.id) {
			masterKey.id = uuid.create();
			masterKey.created_time = Date.now();
		}

		masterKey.updated_time = Date.now();

		if (masterKey.source === SOURCE_LOCAL_VAULT) {
			await this.db().exec(`
				INSERT INTO master_keys (id, created_time, updated_time, source_application, encryption_method, checksum, content, source)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					updated_time = excluded.updated_time,
					source_application = excluded.source_application,
					encryption_method = excluded.encryption_method,
					checksum = excluded.checksum,
					content = excluded.content,
					source = excluded.source
			`, [masterKey.id, masterKey.created_time, masterKey.updated_time, masterKey.source_application, masterKey.encryption_method, masterKey.checksum, masterKey.content, SOURCE_LOCAL_VAULT]);

			this.dispatch({
				type: 'MASTERKEY_UPDATE_ONE',
				item: masterKey,
			});

			return masterKey;
		}

		const idx = syncInfo.masterKeys.findIndex(mk => mk.id === masterKey.id);

		if (idx >= 0) {
			syncInfo.masterKeys[idx] = masterKey;
		} else {
			syncInfo.masterKeys.push(masterKey);
		}

		saveLocalSyncInfo(syncInfo);

		this.dispatch({
			type: 'MASTERKEY_UPDATE_ONE',
			item: masterKey,
		});

		return masterKey;
	}
}
