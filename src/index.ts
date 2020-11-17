import { Buffer } from 'buffer';
import FileSystem, { EncodingType } from 'expo-file-system';
import { join } from 'path';
import { ENOENT } from './errors';

type FileContents = Uint8Array | string;
type Encoding = {
  encoding?: 'utf8';
};
type Mode = {
  mode?: string;
};

const pathToUri = (filepath: string): string => {
  if (FileSystem.documentDirectory === null) {
    return `file://${filepath}`;
  }
  return `file://${join(FileSystem.documentDirectory, filepath)}`;
};

const uintArrayToBase64 = ({ input }: { input: Uint8Array }): string => {
  return Buffer.from(input).toString('base64');
};

const base64ToUintArray = ({ input }: { input: string }): Uint8Array => {
  return Buffer.from(input);
};

const getDataAndEncoding = ({
  data,
  encoding,
}: { data: FileContents } & Encoding) => {
  if (typeof data === 'string') {
    if (typeof encoding === 'string' && encoding !== 'utf8') {
      throw new Error('Encoding #NLeqRd');
    }
    return { data, encoding: EncodingType.UTF8 };
  }
  const uintData = uintArrayToBase64({ input: data });
  return { data: uintData, encoding: EncodingType.Base64 };
};

/**
 *
 * @param filepath
 * @param options.mode - The directory mode. Note this is ignored in expo.
 */
const mkdir = async (filepath: string, _options?: Mode) => {
  const fileUri = pathToUri(filepath);
  await FileSystem.makeDirectoryAsync(fileUri);
  return;
};

const rmdir = async (filepath: string) => {
  const fileUri = pathToUri(filepath);
  await FileSystem.deleteAsync(fileUri);
  return;
};

const readdir = async (filepath: string, _options?: {}) => {
  const fileUri = pathToUri(filepath);
  return FileSystem.readDirectoryAsync(fileUri);
};

/**
 *
 * @param filepath The absolute path to the file (directory must exist)
 * @param data The contents of the file in either binary or string
 * @param options.encoding
 * @param options.mode The mode of this file, ignored, expo doesn't support permissions
 */
const writeFile = async (
  filepath: string,
  data: FileContents,
  options?: Encoding & Mode
) => {
  const fileUri = pathToUri(filepath);
  const { data: contents, encoding } = getDataAndEncoding({
    data,
    encoding: options?.encoding,
  });

  return FileSystem.writeAsStringAsync(fileUri, contents, { encoding });
};

const readFile = async (filepath: string, options?: Encoding) => {
  const fileUri = pathToUri(filepath);
  if (typeof options !== 'undefined' && typeof options.encoding === 'string') {
    if (options.encoding !== 'utf8') {
      throw new Error('readFile() only accepts encoding=utf8 #7Ncob1');
    }
  }
  const encoding =
    options?.encoding === 'utf8' ? EncodingType.UTF8 : EncodingType.Base64;

  const contents = await FileSystem.readAsStringAsync(fileUri, { encoding });

  if (encoding === EncodingType.UTF8) {
    return contents;
  }

  return base64ToUintArray({ input: contents });
};

const unlink = async (filepath: string, _options?: {}) => {
  const fileUri = pathToUri(filepath);
  return FileSystem.deleteAsync(fileUri);
};

const rename = async (oldFilepath: string, newFilepath: string) => {
  const oldFileUri = pathToUri(oldFilepath);
  const newFileUri = pathToUri(newFilepath);
  return FileSystem.moveAsync({ from: oldFileUri, to: newFileUri });
};

const stat = async (filepath: string, _options?: {}) => {
  const fileUri = pathToUri(filepath);
  const stats = await FileSystem.getInfoAsync(fileUri);

  if (!stats.exists) {
    throw new ENOENT(filepath);
  }

  return {
    type: stats.isDirectory ? 'dir' : 'file',
    mode: 0x777,
    size: stats.size,
    ino: 1,
    mtimeMs: stats.modificationTime * 1e3,
    ctimeMs: stats.modificationTime * 1e3,
    uid: 1,
    gid: 1,
    dev: 1,
    isFile() {
      return !stats.isDirectory;
    },
    isDirectory() {
      return stats.isDirectory;
    },
    isSymbolicLink() {
      return false;
    },
  };
};

const lstat = stat;

const symlink = (_target: string, _filepath: string) => {
  throw new Error('Symlinks not suppoerted on expo. #uVMCeB');
};

const readlink = (_filepath: string, _options?: {}) => {
  throw new Error('Symlinks not supported on expo. #6OMLFv');
};

const api = {
  mkdir,
  rmdir,
  readdir,
  writeFile,
  readFile,
  unlink,
  rename,
  stat,
  lstat,
  symlink,
  readlink,
};

export default { promises: api };
