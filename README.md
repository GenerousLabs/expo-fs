# expo-fs

A wrapper around expo's
[FileSystem](https://docs.expo.io/versions/latest/sdk/filesystem/) that
matches node's FS api. Built to support
[isomorphic-git](https://isomorphic-git.org/) on [expo](https://expo.io/).

Limitations:

- Expo doesn't support file modes
  - Currently we return `0o644` all the time. This might cause issues, but in
    an expo context, there are no executable files, so unclear what to do here.
    Most likely, isomorphic-git writes the permissions, we ignore them, and
    hopefully it never checks them.
- Expo doesn't support symlinks
  - Currently we throw in the link related methods.
  - Git itself (including ismorphic-git) doesn't rely on symlinks.
  - This is probably okay for repos which don't include symlinks.

[GitHub](https://github.com/GenerousLabs/expo-fs/issues)
