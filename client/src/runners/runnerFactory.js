import { PyodideRunner } from './PyodideRunner';
import { JavaScriptRunner } from './JavaScriptRunner';

// Cached runner instances
const runners = {
  python: new PyodideRunner(),
  javascript: new JavaScriptRunner(),
};

// Factory function to obtain the appropriate runner strategy
export function getRunner(language = 'python') {
  const runner = runners[language.toLowerCase()];
  if (!runner) {
    throw new Error('No execution runner registered for language: ' + language);
  }
  return runner;
}
