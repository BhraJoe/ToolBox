import {
  analyzeRegex,
  replaceRegex,
  type RegexWorkerRequest,
  type RegexWorkerResponse,
} from '../utils/regexTester';

self.addEventListener('message', (event: MessageEvent<RegexWorkerRequest>) => {
  const request = event.data;
  let response: RegexWorkerResponse;

  try {
    response = request.operation === 'match'
      ? {
        id: request.id,
        success: true,
        operation: 'match',
        result: analyzeRegex(request.pattern, request.flags, request.text),
      }
      : {
        id: request.id,
        success: true,
        operation: 'replace',
        result: replaceRegex(
          request.pattern,
          request.flags,
          request.text,
          request.replacement,
          request.all,
        ),
      };
  } catch (error) {
    response = {
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unable to evaluate this regular expression.',
    };
  }

  self.postMessage(response);
});
