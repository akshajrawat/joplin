import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE master_keys ADD COLUMN source INT NOT NULL DEFAULT 0',
		'ALTER TABLE notes ADD COLUMN is_locally_encrypted INT NOT NULL DEFAULT 0',
		'ALTER TABLE notes ADD COLUMN local_cipher_text TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE notes ADD COLUMN local_master_key_id TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE folders ADD COLUMN is_locally_encrypted INT NOT NULL DEFAULT 0',
		'ALTER TABLE folders ADD COLUMN local_cipher_text TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE folders ADD COLUMN local_master_key_id TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE resources ADD COLUMN is_locally_encrypted INT NOT NULL DEFAULT 0',
		'ALTER TABLE resources ADD COLUMN local_master_key_id TEXT NOT NULL DEFAULT ""',
	];
};