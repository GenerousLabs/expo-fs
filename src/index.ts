import { Buffer } from 'buffer';
import FileSystem, { EncodingType } from 'expo-file-system';
import { dirname, join } from 'path';
import { EEXIST, ENOENT, ENOTDIR } from './errors';

type FileContents = Uint8Array | string;
type Encoding = {
  encoding?: 'utf8';
};
type Mode = {
  mode?: string;
};

// For some reason using octal `0o644` caused a TypeScript build error
// complaining that `includes` was not a property of `undefined`. Setting the
// mode here as a workaround.
const mode = parseInt('0644', 8);

const pathToUri = (filepath: string): string => {
  // NOTE: This will happen in the browser and is probably an error
  if (FileSystem.documentDirectory === null) {
    return `file://${filepath}`;
  }
  return join(FileSystem.documentDirectory, filepath);
};

const uintArrayToBase64 = ({ input }: { input: Uint8Array }): string => {
  return Buffer.from(input).toString('base64');
};

const base64ToUintArray = ({ input }: { input: string }): Uint8Array => {
  return Buffer.from(input, 'base64');
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
 * isomorphic-git expects ENOENT errors to be thrown in some cases, and handles
 * these cases specially. The expo filesystem exceptions are extremely varied,
 * so in some cases we add an extra stat call to check if the file exists, and
 * if not, throw the exception. Unclear what the performance implications of
 * this are. Feedback welcome in the repo issues.
 */
const throwENOENTIfDoesNotExist = async (filepath: string) => {
  const fileUri = pathToUri(filepath);
  const stats = await FileSystem.getInfoAsync(fileUri);

  if (!stats.exists) {
    throw new ENOENT(filepath);
  }
};

const throwIfParentDoesNotExist = async (filepath: string) => {
  const dirpath = dirname(filepath);
  throwENOENTIfDoesNotExist(dirpath);
};

/**
 *
 * @param filepath
 * @param options.mode - The directory mode. Note this is ignored in expo.
 */
const mkdir = async (filepath: string, _options?: Mode) => {
  const fileUri = pathToUri(filepath);
  if (__DEV__) console.log('mkdir called #oN8IFP', { filepath, fileUri });

  // NOTE: isomorphic-git expects `mkdir()` to throw an `ENOENT()` error if the
  // directory does not exist. Isomorphic-git relies on this to recursively
  // create directories. As expo filesystem throws a different error, we test
  // for the existence of the parent directory here and manually throw the error
  // if it does not exist.
  await throwIfParentDoesNotExist(filepath);

  // Again, isomorphic-git expects an EEXIST error to be thrown in case the
  // directory does already exist. It then silently swallows the error, but to
  // preserve interopability let's keep to the expected spec.
  const stats = await FileSystem.getInfoAsync(fileUri);
  if (stats.exists) {
    throw new EEXIST(filepath);
  }

  await FileSystem.makeDirectoryAsync(fileUri);
  return;
};

const rmdir = async (filepath: string) => {
  throwENOENTIfDoesNotExist(filepath);
  const fileUri = pathToUri(filepath);
  await FileSystem.deleteAsync(fileUri);
  return;
};

const readdir = async (filepath: string, _options?: {}) => {
  const fileUri = pathToUri(filepath);

  const stats = await FileSystem.getInfoAsync(fileUri);
  if (!stats.isDirectory) {
    throw new ENOTDIR(filepath);
  }

  return await FileSystem.readDirectoryAsync(fileUri);
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

  // NOTE: isomorphic-git expects `writeFile()` to throw an `ENOENT()` error if
  // the directory does not exist. As expo filesystem throws a different error,
  // we test for the existence of the parent directory here and manually throw
  // the error if it does not exist.
  await throwIfParentDoesNotExist(filepath);

  return await FileSystem.writeAsStringAsync(fileUri, contents, { encoding });
};

// const readFile = async (filepath: string, options?: Encoding): Promise<FileContents> => {
async function readFile(
  filepath: string,
  options: Required<Encoding>
): Promise<string>;
async function readFile(filepath: string): Promise<Uint8Array>;
async function readFile(
  filepath: string,
  options?: Encoding
): Promise<FileContents> {
  const fileUri = pathToUri(filepath);
  if (typeof options !== 'undefined' && typeof options.encoding === 'string') {
    if (options.encoding !== 'utf8') {
      throw new Error('readFile() only accepts encoding=utf8 #7Ncob1');
    }
  }
  const encoding =
    options?.encoding === 'utf8' ? EncodingType.UTF8 : EncodingType.Base64;

  const contents = await FileSystem.readAsStringAsync(fileUri, { encoding });

  if (__DEV__)
    console.log('readFile() called #RkR9g1', { fileUri, encoding, contents });

  if (encoding === EncodingType.UTF8) {
    return contents;
  }

  return base64ToUintArray({ input: contents });
}

const unlink = async (filepath: string, _options?: {}) => {
  throwENOENTIfDoesNotExist(filepath);
  const fileUri = pathToUri(filepath);
  return await FileSystem.deleteAsync(fileUri);
};

const rename = async (oldFilepath: string, newFilepath: string) => {
  const oldFileUri = pathToUri(oldFilepath);
  const newFileUri = pathToUri(newFilepath);
  return await FileSystem.moveAsync({ from: oldFileUri, to: newFileUri });
};

const stat = async (filepath: string, _options?: {}) => {
  const fileUri = pathToUri(filepath);
  const stats = await FileSystem.getInfoAsync(fileUri);

  if (!stats.exists) {
    throw new ENOENT(filepath);
  }

  return {
    type: stats.isDirectory ? 'dir' : 'file',
    mode,
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
