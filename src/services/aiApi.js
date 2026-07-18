import { hostAuthRequest } from './hostAuthRequest'

export async function generateQuestionsWithAiApi(accessToken, payload) {
  return hostAuthRequest('/ai/generate-questions', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      topic: payload.topic,
      count: payload.count,
      question_type: payload.questionType,
      difficulty: payload.difficulty,
    }),
  })
}

export async function listAiQuestionTypesApi(accessToken) {
  const data = await hostAuthRequest('/ai/question-types', accessToken)
  return data?.question_types || []
}
