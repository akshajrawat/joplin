import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE notes ADD COLUMN is_locally_encrypted INT NOT NULL DEFAULT 0',
		'ALTER TABLE notes ADD COLUMN local_cipher_text TEXT NOT NULL DEFAULT ""',
		'CREATE INDEX notes_is_locally_encrypted ON notes (is_locally_encrypted)',
		'ALTER TABLE master_keys ADD COLUMN source INT NOT NULL DEFAULT 1',
	];
};