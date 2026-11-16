import { readRepositoryProjection } from './public-repository-reader.mjs';
import { browserRepositoryProjection } from './render-repository-documentation.mjs';

export async function refreshFromGitHub(repository, options, published) {
  const projection = await readRepositoryProjection(repository, options, { published });
  return browserRepositoryProjection(projection);
}
