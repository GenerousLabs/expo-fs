# expo-fs

A wrapper around expo's FileSystem that matches node's FS api. Built to support isomorphic-git on expo.

Limitations:

- Expo doesn't support file modes
  - Currently we return 0x777 all the time, but that will probably cause
    issues because git will try to set the correct permissions.
- Expo doesn't support symlinks
  - Currently we throw in the link related methods.
  - This is probably okay for repos which don't include symlinks.
  - Git itself (including ismorphic-git) doesn't rely on symlinks.
