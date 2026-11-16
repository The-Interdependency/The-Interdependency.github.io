import { readPublicHead, readPublicDocumentTree } from './public-repository-git.mjs';
import { readRepositoryProjection } from './public-repository-reader.mjs';
export { REPOSITORY_NOT_PUBLIC, isRepositoryNotPublicError, MAX_DOCUMENT_BYTES, MAX_TOTAL_BYTES, selectDocumentationPaths } from './public-repository-reader.mjs';

const publicGitTransport = { head: readPublicHead, tree: readPublicDocumentTree };

export function fetchRepositoryPublicProjection(repository, options, publicGit = publicGitTransport) {
  return readRepositoryProjection(repository, options, { publicGit, token: process.env.GITHUB_TOKEN });
}
